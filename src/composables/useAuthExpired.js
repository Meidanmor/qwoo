import { Dialog } from 'quasar'
import { clearSessionState } from 'src/composables/useSessionCleanup.js'
let shown = false

export function initAuthPopup() {
    if (typeof window === 'undefined') return

    window.addEventListener('auth-expired', () => {
        clearSessionState()

        if (shown) return

        shown = true

        Dialog.create({
            title: 'Session Expired',
            class: 'expired-dialog',
            message: 'Your session ended. Continue as guest or login again.',
            ok: {label: 'Login Again', color: 'secondary'},
            cancel: {label: 'Continue as Guest', color: 'secondary'},
            persistent: true,
            noEscDismiss: true,
            noBackdropDismiss: true
        }).onOk(() => {
            window.location.href = '/my-account'  // hard reload instead of router.push
        })
    })
}