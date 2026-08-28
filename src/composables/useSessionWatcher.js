import { fetchWithToken, getWasLoggedIn } from 'src/composables/useApiFetch.js'
import { clearSessionState } from 'src/composables/useSessionCleanup.js'
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'

const ME_ENDPOINT = '/wp-json/qwoo/v1/me'

// Don't re-check on every single tab-focus in quick succession (e.g. someone
// alt-tabbing back and forth) — once every 60s is plenty for catching a
// session that actually expired while the tab was in the background.
const MIN_CHECK_INTERVAL_MS = 60 * 1000

    let lastCheck = 0
    let checking = false
    let installed = false

    async function checkSession() {
        if (checking) return
        if (!getWasLoggedIn()) return // nothing to validate if we don't think we're logged in

        const now = Date.now()
        if (now - lastCheck < MIN_CHECK_INTERVAL_MS) return
        lastCheck = now

        checking = true
        try {
            const res = await fetchWithToken(ME_ENDPOINT)
            // A non-ok response here is handled inside fetchWithToken itself:
            // after its own nonce-retry, a real 401/403 dispatches 'auth-expired'.
            // We still clean up directly (not just via that event) so this doesn't
            // depend on the auth-expired popup listener having been registered yet.
            if (!res.ok) clearSessionState()
            await Promise.allSettled([
                cart.fetchCart(true, null, { authoritative: true }),
                wishlist.fetchWishlistItems()
            ])
        } catch {
            // Network hiccup / offline — not evidence of a dead session, ignore.
        } finally {
            checking = false
        }
    }

    /**
      * Re-checks session validity whenever the user comes back to the site:
      * tab regains focus, or the page becomes visible again (covers switching
      * back from another app on mobile, restoring a backgrounded tab, etc).
      *
      * Call once, early (doesn't need to wait for interaction-gated hydration —
      * it's cheap: just two listeners until the user is actually known to have
      * a session to validate).
      */
    export function initSessionWatcher() {
        if (typeof window === 'undefined' || installed) return
        installed = true

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkSession()
        })

        window.addEventListener('focus', checkSession)
        checkSession()
    }
