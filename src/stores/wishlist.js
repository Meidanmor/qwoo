import { reactive, toRaw } from 'vue'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import { isLoggedIn } from 'src/stores/user'
import { matFavorite } from '@quasar/extras/material-icons'

/* -------------------------
   Constants
   ------------------------- */
const DEBUG = import.meta.env.DEV
const LOCAL_WL_KEY = 'local_wl_v1'
const LEGACY_WL_OFFLINE_KEY = 'offline_wl'


/* -------------------------
   State
   ------------------------- */
const state = reactive({
  items: [],
  loading: new Set(),
  error: null,
  offline: typeof window !== 'undefined' ? !navigator.onLine : false
})

/* -------------------------
   Helpers
   ------------------------- */
function isLoading(productId) {
  return state.loading.has(productId)
}
function notifyUser($q, type, message, icon) {
  if ($q?.notify) $q.notify({ type, message, icon })
}

/* -------------------------
   Persistence
   ------------------------- */
function persist() {
  const isClient = typeof window !== 'undefined'
  if (!isClient) return
  try {
    const raw = state.items.map(item => toRaw(item))
    const data = JSON.stringify(raw)
    localStorage.setItem(LOCAL_WL_KEY, data)
    localStorage.setItem(LEGACY_WL_OFFLINE_KEY, data)
  } catch (err) {
    if (DEBUG) console.warn('[cart] persistLocalWL failed', err)
  }
}

function load() {
  try {
    const raw = localStorage.getItem(LOCAL_WL_KEY)
    if (raw) state.items = JSON.parse(raw)
  } catch (err) {
    if (DEBUG) console.warn('[wishlist] load failed', err)
  }
}

/* -------------------------
   Product cache helper
   (re-uses the same getCachedProduct logic as cart,
    but we import productsStore directly to keep wishlist self-contained)
   ------------------------- */
async function _getCachedProduct(productId) {
  // Lazy import to avoid circular dependency with cart
  try {
    const productsStore = (await import('src/stores/products')).default
    const fromStore = productsStore.getById(Number(productId))
    if (fromStore) return fromStore

    if (typeof window !== 'undefined' && 'caches' in window) {
      const cache = await caches.open('products-cache')
      const res = await cache.match('/api/products')
      if (res?.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const found = data.find(p => Number(p.id) === Number(productId))
          if (found) return found
        }
      }
    }

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await productsStore.fetchProductsIfNeeded()
      return productsStore.getById(Number(productId)) || null
    }
  } catch (err) {
    if (DEBUG) console.warn('[wishlist] _getCachedProduct failed', err)
  }
  return null
}

function _buildSlugFromPermalink(permalink) {
  try {
    const url = new URL(permalink)
    return url.pathname
        .replace(/^\/product/, '')
        .replace(/\/$/, '')
        .replace(/^\//, '')
  } catch {
    return ''
  }
}

/* -------------------------
   Public API
   ------------------------- */
async function fetchWishlistItems() {
  if (typeof window === 'undefined') return

  // Always load local first for instant UI
  load()

  if (state.offline || !isLoggedIn.value) return

  try {
    const res = await fetchWithToken('/wp-json/qwoo/v1/wishlist/', {
      method: 'GET',
      credentials: 'include'
    })
    const serverWishlist = await res.json()
    const serverItems = serverWishlist.wishlist || serverWishlist || []

    // Merge: server is authoritative, keep any local-only items not yet on server
    //const serverIds = new Set(serverItems.map(i => i.id))
    //const localOnly = state.items.filter(i => !serverIds.has(i.id))
    state.items = [...serverItems]
    persist()
  } catch (err) {
    if (DEBUG) console.warn('[wishlist] fetchWishlistItems failed', err)
    state.error = err.message
    load() // fallback to local
  }
}

async function toggleWishlistItem(productId, $q = null) {
  if (state.loading.has(productId)) return
  state.loading.add(productId)

  // --- GUEST / OFFLINE LOGIC ---
  if (state.offline || !isLoggedIn.value) {
    try {
      if (!Array.isArray(state.items)) state.items = []

      const exists = state.items.find(p => p.id === productId)
      if (exists) {
        state.items = state.items.filter(p => p.id !== productId)
      } else {
        const cachedProduct = await _getCachedProduct(productId)
        const slug = cachedProduct?.permalink
            ? _buildSlugFromPermalink(cachedProduct.permalink)
            : ''
        const newItem = cachedProduct
            ? {
              id: cachedProduct.id,
              name: cachedProduct.name,
              image: cachedProduct?.images?.[0]?.thumbnail || '',
              slug
            }
            : { id: productId }
        state.items.push(newItem)
      }

      persist()
      notifyUser($q, 'positive', exists ? 'Removed from wishlist' : 'Added to wishlist', matFavorite)
    } catch (err) {
      if (DEBUG) console.warn('[wishlist] guest toggle failed', err)
    } finally {
      state.loading.delete(productId)
    }
    return
  }

  // --- LOGGED-IN LOGIC (optimistic update) ---
  try {
    const exists = state.items.find(p => p.id === productId)

    // Optimistic update
    if (exists) {
      state.items = state.items.filter(p => p.id !== productId)
    } else {
      const cachedProduct = await _getCachedProduct(productId)
      const newItem = cachedProduct
          ? { id: cachedProduct.id, name: cachedProduct.name, images: cachedProduct.images }
          : { id: productId }
      state.items.push(newItem)
    }
    persist()

    // Sync with backend
    const res = await fetchWithToken('/wp-json/qwoo/v1/wishlist/', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId })
    })
    const wishlistData = await res.json()
    state.items = wishlistData.wishlist || wishlistData || []
    persist()

    notifyUser($q, 'positive', exists ? 'Removed from wishlist' : 'Added to wishlist', matFavorite)
  } catch (err) {
    if (DEBUG) console.error('[wishlist] toggleWishlistItem failed', err)
    state.error = err.message
  } finally {
    state.loading.delete(productId)
  }
}

/* -------------------------
   LOGIN MERGE

   The toggle endpoint only flips membership for a single product_id — there's
   no bulk "add these IDs" route. That's fine for a merge though: since we only
   ever call toggle for IDs we've already confirmed are NOT on the server, each
   call can only add, never accidentally remove something the account already
   had saved.

   Steps:
     1. Fetch the server wishlist now that the session is authenticated.
     2. Work out which guest (local) items aren't already on the server.
     3. Toggle each of those in turn (each call adds it).
     4. Adopt the final server response as the new state — at that point
        there's nothing local-only left to lose on the next toggle.
   ------------------------- */
async function mergeGuestWishlistOnLogin() {
  if (typeof window === 'undefined') return
  if (state.offline) return

  try {
    const res = await fetchWithToken('/wp-json/qwoo/v1/wishlist/', {
      method: 'GET',
      credentials: 'include'
    })
    const serverWishlist = await res.json()
    const serverItems = serverWishlist.wishlist || serverWishlist || []
    const serverIds = new Set(serverItems.map(i => i.id))

    const localOnly = (state.items || []).filter(i => !serverIds.has(i.id))

    let finalItems = serverItems
    for (const item of localOnly) {
      try {
        const toggleRes = await fetchWithToken('/wp-json/qwoo/v1/wishlist/', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: item.id })
        })
        const data = await toggleRes.json()
        finalItems = data.wishlist || data || finalItems
      } catch (err) {
        if (DEBUG) console.warn('[wishlist] mergeGuestWishlistOnLogin: toggle failed for', item.id, err)
        // Keep going — one failed item shouldn't abort the rest of the merge
      }
    }

    state.items = finalItems
    persist()
  } catch (err) {
    if (DEBUG) console.warn('[wishlist] mergeGuestWishlistOnLogin failed', err)
    // Leave local state as-is; the next fetchWishlistItems() call will retry the merge cosmetically
  }
}

/* -------------------------
   LOGOUT — clear both in-memory and persisted state so the next
   guest/user session on this browser doesn't inherit it.
   ------------------------- */
function clearWishlist() {
  state.items = []
  try {
    persist()
  } catch (err) {
    if (DEBUG) console.warn('[wishlist] clearWishlist failed', err)
  }
}

/* -------------------------
   Init
   ------------------------- */
if (typeof window !== 'undefined') {
  load()
  window.addEventListener('online', () => { state.offline = false })
  window.addEventListener('offline', () => { state.offline = true })

  window.addEventListener('storage', e => {
    if (e.key === LOCAL_WL_KEY || e.key === LEGACY_WL_OFFLINE_KEY) {
      try {
        state.items = JSON.parse(e.newValue || '[]')
      } catch (err) {
        if (DEBUG) console.warn('[cart] storage sync failed', err)
      }
    }
  })
}

/* -------------------------
   Exports
   ------------------------- */
export default {
  state,
  fetchWishlistItems,
  toggleWishlistItem,
  mergeGuestWishlistOnLogin,
  clearWishlist,
  isLoading
}