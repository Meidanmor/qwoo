<template>
  <q-input
      v-model="model.address_1"
      :label="required ? `${addressLabel} *` : addressLabel"
      filled
      class="q-mb-sm"
      :rules="required ? [val => !!val || `${addressLabel} is required`] : []"
  />
  <q-input
      v-model="model.city"
      :label="required ? 'City *' : 'City'"
      filled
      class="q-mb-sm"
      :rules="required ? [val => !!val || 'City is required'] : []"
  />
  <q-input
      v-model="model.postcode"
      :label="required ? 'Postcode *' : 'Postcode'"
      filled
      class="q-mb-sm"
      :rules="required ? [val => !!val || 'Postcode is required'] : []"
  />
  <q-input v-model="model.country" label="Country" filled />
</template>

<script setup>
// Shared address block used for both shipping and billing.
// `modelValue` is expected to be a reactive sub-object (e.g. form.shipping or form.billing)
// so mutations here flow straight back into the parent's reactive form state.
defineProps({
  addressLabel: {
    type: String,
    default: 'Address'
  },
  required: {
    type: Boolean,
    default: true
  }
})

const model = defineModel({
  type: Object,
  required: true
})
</script>