import { ref, nextTick } from 'vue'

// Show the soft-ask on the 3rd page view within this browser session (initial
// load counts as view #1) — i.e. after the user has navigated twice, not on
// their very first visit. Tune this single constant if the timing should change.
const TRIGGER_AT_NAV_COUNT = 3

const NAV_COUNT_KEY = 'qwoo_nav_count'
const DISMISSED_KEY = 'qwoo_notif_soft_ask_dismissed'

export const showNotificationSoftAsk = ref(false)

let initialized = false

/**
 * Starts counting page views for the current browser session and flips
 * `showNotificationSoftAsk` on once the threshold is hit. Counting resets
 * each new tab/session (sessionStorage), and once dismissed it won't show
 * again for the rest of that session. The caller is still responsible for
 * also checking permission/support/VAPID-configured state before actually
 * rendering the modal — this composable only tracks "have they browsed
 * enough to ask."
 */
export function initNotificationSoftAskTracking(router) {
    if (initialized || typeof window === 'undefined') return

    const alreadyDismissed = () => sessionStorage.getItem(DISMISSED_KEY) === '1'

    const bump = () => {
        if (alreadyDismissed() || showNotificationSoftAsk.value) return

        const count = Number(sessionStorage.getItem(NAV_COUNT_KEY) || '0') + 1
        sessionStorage.setItem(NAV_COUNT_KEY, String(count))

        if (count >= TRIGGER_AT_NAV_COUNT) {
            showNotificationSoftAsk.value = true
        }
    }

    bump() // counts the current/initial page as view #1
    router.afterEach(() => {
        nextTick(() => {
            bump()
        })
    })
}

export function dismissNotificationSoftAsk() {
    showNotificationSoftAsk.value = false
    if (typeof window !== 'undefined') {
        sessionStorage.setItem(DISMISSED_KEY, '1')
    }

}