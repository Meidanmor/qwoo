import { ref } from 'vue'

/**
 * Frontend bot trap for public forms (login, forgot-password, guest
 * checkout, etc). Two independent signals, either one is enough to
 * flag a submission as automated:
 *
 *  1. Honeypot field — a form field real users never see or fill.
 *     Scripted bots that blindly fill every input on the page will
 *     populate it; a human never will.
 *  2. Time trap — the form was submitted less time after it mounted
 *     than any human could realistically read + fill it in. Catches
 *     bots that skip the honeypot field but still submit instantly.
 *
 * This is a UX-free first line of defense against unsophisticated/
 * scripted bots. It is NOT a substitute for server-side rate
 * limiting or a real challenge (e.g. hCaptcha) against determined
 * or headless-browser-driven bots — those still need to be enforced
 * on the backend (qwoo-core).
 *
 * Usage:
 *   const { honeypotField, isLikelyBot } = useHoneypot()
 *   // template: bind honeypotField to a field hidden via the
 *   // .hp-field utility class (see src/css/app.css)
 *   // on submit: if (isLikelyBot()) { bail out quietly, don't call the API }
 */
export function useHoneypot(minSubmitMs = 1500) {
    const honeypotField = ref('')
    const mountedAt = Date.now()

    function isLikelyBot() {
        if (honeypotField.value) return true
        if (Date.now() - mountedAt < minSubmitMs) return true
        return false
    }

    return { honeypotField, isLikelyBot }
}