// useFetchApi.js
//import {isLoggedIn} from 'src/stores/user.js'

let authExpiredTriggered = false

const CART_TOKEN_COOKIE = 'wc_cart_token'
const CART_TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const STORE_API_PATH = '/wp-json/wc/store' // matches cart, checkout, etc.

const NONCE_STORAGE_KEY = 'wp_nonce'
const NONCE_ENDPOINT = '/wp-json/qwoo/v1/nonce'

// ---------------------------------------------------------------------------
// Auth-expired handling (unchanged)
// ---------------------------------------------------------------------------

export function getWasLoggedIn() {
  if (typeof window === 'undefined') return false // SSR safe
  return localStorage.getItem('wasLoggedIn') === 'true'
}

export function setLoggedIn(value) {
  if (typeof window === 'undefined') return
  if (value) {
    localStorage.setItem('wasLoggedIn', 'true')
  } else {
    localStorage.removeItem('wasLoggedIn')
    authExpiredTriggered = false
    clearNonce() // stale identity's nonce is worthless once we know we're logged out
  }
}

// ---------------------------------------------------------------------------
// Nonce storage + refresh
// ---------------------------------------------------------------------------
// A wp_rest nonce isn't revocable and isn't tied to "logged in" by itself —
// it's just a short-lived hash of (user id, session token, ~24h tick). It goes
// stale in three ordinary situations that have nothing to do with the user
// actually being logged out: the tick rolls over, you logged in/out in
// another tab, or this is simply the first load and nothing's in storage yet.
// So a 401/403 on a nonce-bearing request means "try a fresh nonce once" —
// NOT "the user is logged out" — until a retry with a fresh nonce also fails.

function getNonce() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(NONCE_STORAGE_KEY)
}

function setNonce(nonce) {
  if (typeof window === 'undefined' || !nonce) return
  localStorage.setItem(NONCE_STORAGE_KEY, nonce)
}

function clearNonce() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(NONCE_STORAGE_KEY)
}

let nonceFetchPromise = null

// Fetches a fresh nonce for whoever the cookie currently belongs to
// (logged-in user, or anonymous — both are valid). Concurrent callers
// share one in-flight request instead of each firing their own.
async function fetchFreshNonce() {
  if (nonceFetchPromise) return nonceFetchPromise

  nonceFetchPromise = fetch(NONCE_ENDPOINT, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null
        const data = await res.json()
        if (data?.nonce) setNonce(data.nonce)
        return data?.nonce ?? null
      })
      .catch(() => null)
      .finally(() => {
        nonceFetchPromise = null
      })

  return nonceFetchPromise
}

// Call this once on app boot, and again right after a successful
// login/google-login/logout response — the identity just changed, so
// whatever nonce is cached (if any) belongs to the old identity.
export async function refreshNonce() {
  return fetchFreshNonce()
}

// ---------------------------------------------------------------------------
// Cart token persistence (moved in from cart.js)
// ---------------------------------------------------------------------------

function isStoreApiRequest(url) {
  return typeof url === 'string' && url.includes(STORE_API_PATH)
}

function buildCookieString(token, { secure }) {
  return [
    `${CART_TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    `Max-Age=${CART_TOKEN_COOKIE_MAX_AGE}`,
    'Path=/',
    'SameSite=Lax', // Strict breaks the cookie on redirect-back from payment gateways
    secure ? 'Secure' : ''
  ].filter(Boolean).join('; ')
}

// Read the token — localStorage on client, cookie header on SSR (or as client fallback)
function getCartToken(ssrContext = null) {
  // SSR: read from the incoming request cookie
  if (ssrContext?.req) {
    try {
      const cookieHeader = ssrContext.req.headers?.cookie || ''
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CART_TOKEN_COOKIE}=([^;]+)`))
      return match ? decodeURIComponent(match[1]) : null
    } catch {
      return null
    }
  }

  // Client: prefer localStorage (always up-to-date with the latest rolling token)
  if (typeof window !== 'undefined') {
    try {
      const fromStorage = localStorage.getItem(CART_TOKEN_COOKIE)
      if (fromStorage) return fromStorage
    } catch { /* ignore */ }
  }

  // Client fallback: read from cookie (e.g. after a hard reload cleared localStorage)
  if (typeof document !== 'undefined') {
    try {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CART_TOKEN_COOKIE}=([^;]+)`))
      return match ? decodeURIComponent(match[1]) : null
    } catch { /* ignore */ }
  }

  return null
}

// Write the rotated token wherever it needs to end up:
// - localStorage + cookie on the client
// - Set-Cookie on the outgoing SSR response, so the browser gets it on this render
function saveCartToken(response, ssrContext = null) {
  try {
    const token = response.headers.get('Cart-Token')
    if (!token) return

    const secure = typeof window !== 'undefined'
        ? location.protocol === 'https:'
        : ssrContext?.req?.protocol === 'https'

    if (typeof window !== 'undefined') {
      localStorage.setItem(CART_TOKEN_COOKIE, token)
    }

    if (typeof document !== 'undefined') {
      document.cookie = buildCookieString(token, { secure })
    }

    if (ssrContext?.res) {
      const cookieStr = buildCookieString(token, { secure })
      const existing = ssrContext.res.getHeader('Set-Cookie')
      const cookies = Array.isArray(existing) ? existing : existing ? [existing] : []
      ssrContext.res.setHeader('Set-Cookie', [...cookies, cookieStr])
    }
  } catch {
    /* ignore */
  }
}

export function clearCartToken() {
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(CART_TOKEN_COOKIE) } catch { /* ignore */ }
  }
  if (typeof document !== 'undefined') {
    // Max-Age=0 deletes the cookie; must match Path (and SameSite doesn't
    // matter for deletion, but keep attributes consistent to be safe)
    document.cookie = `${CART_TOKEN_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

/**
 * @param {string} url
 * @param {RequestInit} options
 * @param {object|null} ssrContext
 * @param {object} config
 * @param {boolean} config.skipNonceRetry - set true for endpoints where a
 *   401/403 is an expected application response, not a stale-nonce signal
 *   (e.g. /login with wrong credentials, or the /nonce endpoint itself —
 *   retrying those would just loop or waste a request).
 */
export async function fetchWithToken(url, options = {}, ssrContext = null, config = {}) {
  const { skipNonceRetry = false, _isRetry = false } = config
  const isClient = typeof window !== 'undefined'
  const isStoreApi = isStoreApiRequest(url)

  // Only attach the cart token on Store API calls (cart/checkout),
  // not on every request this function handles.
  //const cartToken = (isStoreApi && !isLoggedIn.value) ? getCartToken(ssrContext) : null
  const cartToken = isStoreApi ? getCartToken(ssrContext) : null

  const nonceVal = isClient ? getNonce() : null

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(nonceVal ? { 'X-WP-Nonce': nonceVal } : {}),
      ...(cartToken ? { 'Cart-Token': cartToken } : {}),
      ...(options.headers || {}), // caller headers win if explicitly set
    },
  })

  // Persist the latest rolling token from the response, wherever it needs to go
  /*if (isStoreApi && !isLoggedIn.value) {
    saveCartToken(response, ssrContext)
  }*/
  if (isStoreApi) {
    saveCartToken(response, ssrContext)
  }

  // WordPress sends a refreshed nonce on every cookie-authenticated REST
  // response — pick it up so the stored nonce never goes stale mid-session.
  const refreshedNonce = response.headers.get('X-WP-Nonce')
  if (refreshedNonce && isClient) {
    setNonce(refreshedNonce)
  }

  const isAuthFailure = response.status === 401 || response.status === 403
  const isDataRequest =
      url.includes('wp-json') ||
      !url.match(/\.(js|css|woff2?|png|jpg)$/)

  if (isAuthFailure && isClient && isDataRequest) {
    // First auth failure on a nonce-bearing request: it's very likely just a
    // stale nonce (tick rollover, logged in/out in another tab, first load
    // with nothing cached yet), not an actual expired session. Try exactly
    // once with a freshly-fetched nonce before treating this as real.
    if (!skipNonceRetry && !_isRetry) {
      const fresh = await fetchFreshNonce()
      if (fresh) {
        return fetchWithToken(url, options, ssrContext, { skipNonceRetry, _isRetry: true })
      }
    }

    // Either we've already retried with a fresh nonce and still failed, or
    // this endpoint opted out of retrying — this is the point where it's
    // safe to treat it as a real logout/expiry.
    if (getWasLoggedIn() && !authExpiredTriggered) {
      authExpiredTriggered = true
      window.dispatchEvent(new CustomEvent('auth-expired'))
    }
  }

  return response
}