<!-- src/components/shop/ArchivePagination.vue -->
<template>
  <div v-if="totalPages > 1" class="q-mt-lg flex flex-center pagination-btns">
    <q-pagination
        :model-value="modelValue"
        @update:model-value="v => { $emit('update:modelValue', v); $emit('page-change', v) }"
        :max="totalPages || 1"
        max-pages="6"
        boundary-numbers
        direction-links
        :icon-prev="matKeyboardArrowLeft"
        :icon-next="matKeyboardArrowRight"
        color="secondary"
    />
  </div>
</template>

<script setup>
import { matKeyboardArrowLeft, matKeyboardArrowRight } from '@quasar/extras/material-icons'
defineProps({ modelValue: Number, totalPages: Number })
defineEmits(['update:modelValue', 'page-change'])
</script>