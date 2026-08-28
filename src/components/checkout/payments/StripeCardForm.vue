<template>
  <div>
    <div v-if="loading" class="flex flex-center q-pa-md">
      <q-spinner color="secondary" size="2em" />
    </div>

    <div v-show="!loading">
      <div ref="expressEl" class="q-mb-md"></div>
      <div v-if="showDivider" class="text-center text-grey q-mb-md">— or pay with card —</div>
      <div ref="cardEl" class="stripe-card-element q-pa-md" style="border:1px solid #ccc; border-radius:4px; background:#fff;"></div>
    </div>
    <div v-if="cardError" class="text-negative q-mt-sm">{{ cardError }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { getStripe } from "src/payments/adapters/stripe.js";

const props = defineProps({
  amount: { type: Number, required: true },   // total, in smallest currency unit
  currency: { type: String, default: 'ils' },
})

const emit = defineEmits(['ready', 'wallet-payment'])
const cardEl = ref(null)
const expressEl = ref(null)
const cardError = ref('')
const loading = ref(true)
const showDivider = ref(false)

let stripe = null
let card = null
let elements = null
let expressCheckoutElement = null // move out of the closure so onBeforeUnmount can reach it

onMounted(async () => {
  stripe = await getStripe()

  elements = stripe.elements({
    mode: 'payment',
    amount: props.amount,
    currency: props.currency,
    paymentMethodCreation: 'manual'
  })

  // --- Express Checkout Element: Apple Pay, Google Pay, Link, unified ---
  expressCheckoutElement = elements.create('expressCheckout')
  expressCheckoutElement.mount(expressEl.value)

  expressCheckoutElement.on('ready', ({ availablePaymentMethods }) => {
    showDivider.value = !!availablePaymentMethods
  })

  expressCheckoutElement.on('confirm', async (event) => {
    const { error: submitError } = await elements.submit()
    if (submitError) {
      event.paymentFailed({ reason: 'fail' })
      return
    }

    const { paymentMethod, error } = await stripe.createPaymentMethod({ elements })
    if (error) {
      event.paymentFailed({ reason: 'fail' })
      return
    }

    emit('wallet-payment', {
      paymentMethod,
      complete: (status) => {
        if (status !== 'success') event.paymentFailed({ reason: 'fail' })
        // on success, the parent navigates away, which unmounts this component
      },
    })
  })

  // --- Manual card entry (unchanged) ---
  card = elements.create('card', {
    style: { base: { fontSize: '16px', color: '#000' } },
    hidePostalCode: true,
  })
  card.mount(cardEl.value)
  card.on('change', (e) => { cardError.value = e.error ? e.error.message : '' })
  expressCheckoutElement.on('ready', () => { loading.value = false })

  emit('ready', {
    stripe,
    async createPaymentMethod(billingDetails) {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card,
        billing_details: billingDetails,
      })
      if (error) throw new Error(error.message)
      return paymentMethod
    },
  })
})

watch(() => props.amount, (newAmount) => {
  if (elements) {
    elements.update({ amount: newAmount })
  }
})

onBeforeUnmount(() => {
  card?.destroy()
  expressCheckoutElement?.destroy()
  card = null
  expressCheckoutElement = null
  elements = null
  stripe = null
})
</script>