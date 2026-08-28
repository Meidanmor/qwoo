let stripePromise = null

export async function getStripe() {
    if (!stripePromise) {
        const { loadStripe } = await import('@stripe/stripe-js/pure')
        stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
    }
    return stripePromise
}


// Fully tears down Stripe.js — not just our reference to it.
// The test-mode badge is an iframe Stripe injects into <body> directly,
// independent of any Elements/Card instance, so destroying elements
// never removes it. We have to remove the script + injected nodes ourselves.
export function resetStripe() {
    stripePromise = null

    if (typeof document === 'undefined') return

    document.querySelectorAll('script[src*="js.stripe.com"]').forEach(el => el.remove())
    document.querySelectorAll('iframe[src*="js.stripe.com"], iframe[name*="stripe"]').forEach(el => el.remove())

    if (window.Stripe) {
        try { delete window.Stripe } catch { window.Stripe = undefined }
    }
}

export default {
    id: 'stripe',
    label: 'Pay with Stripe',
    component: () => import('src/components/checkout/payments/StripeCardForm.vue'),
    async getPaymentData({ controller, billing }) {
        if (!controller) throw new Error('Card details are not ready yet.')
        const paymentMethod = await controller.createPaymentMethod(billing)
        return [
            { key: 'payment_method', value: 'stripe' },
            { key: 'wc-stripe-payment-method', value: paymentMethod.id },
            { key: 'wc-stripe-is-deferred-intent', value: true },
        ]
    },

    async handlePaymentResult(orderResponse, { controller }) {
        const details = orderResponse?.payment_result?.payment_details || []
        const redirect = details.find(d => d.key === 'redirect')?.value || ''

        // No 3DS challenge required — nothing to do
        if (!redirect.startsWith('#wc-stripe-confirm-pi:') && !redirect.startsWith('#wc-stripe-confirm-si:')) {
            return
        }

        const isSetupIntent = redirect.startsWith('#wc-stripe-confirm-si:')
        const [, orderId, clientSecret, nonce] = redirect.replace('#', '').split(':')

        const { error } = isSetupIntent
            ? await controller.stripe.confirmCardSetup(clientSecret)
            : await controller.stripe.confirmCardPayment(clientSecret)

        if (error) {
            throw new Error(error.message || 'Payment authentication failed.')
        }

        // Tell WooCommerce the intent was confirmed so it can finalize the order
        const intentId = clientSecret.split('_secret_')[0]
        const verifyUrl = '/?wc-ajax=wc_stripe_verify_intent'
            + `&order=${orderId}&nonce=${nonce}&intent_id=${intentId}&is_ajax=true`

        const verifyRes = await fetch(verifyUrl, { credentials: 'include' })
        if (!verifyRes.ok) {
            throw new Error('Payment could not be verified. Please contact support.')
        }
    },
}