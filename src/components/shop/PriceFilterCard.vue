<!-- src/components/shop/PriceFilterCard.vue -->
<template>
  <div class="filters-inner-wrap q-pa-md q-mb-md" v-if="!min">
    <q-skeleton type="rect" class="q-mb-md" />
  </div>
  <q-card class="filters-inner-wrap price-range-wrap q-pa-md q-mb-md" v-else>
    <div class="text-subtitle1 q-mb-sm">Filter by Price</div>
    <q-range
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :min="min"
        :max="max"
        label-always
        label
        dense
        color="secondary"
        :step="0.01"
        aria-label="Price range filter"
        @change="$emit('change')"
    />
  </q-card>
</template>

<script setup>
defineProps({ modelValue: Object, min: Number, max: Number })
defineEmits(['update:modelValue', 'change'])
</script>