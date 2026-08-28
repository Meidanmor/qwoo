import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'
import { setLoggedIn } from 'src/composables/useApiFetch.js'
import { clearUser } from 'src/stores/user.js'
    /**
      * Single source of truth for "this session is no longer valid" cleanup.
      *
      * Call this directly anywhere a dead session is detected (a failed /me
      * check, a 401 handler, a proactive watcher, etc.) instead of clearing
      * cart/wishlist by hand — that's what let the wishlist go stale before:
      * one call site cleared both stores, another only remembered the cart.
      *
      * Safe to call more than once — clear()/clearWishlist() are idempotent.
      */
    export function clearSessionState() {
        setLoggedIn(false)
        clearUser()
        cart.resetCartIdentity()
        wishlist.clearWishlist()
    }