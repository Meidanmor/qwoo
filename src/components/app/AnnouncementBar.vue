<!-- AnnouncementBar.vue -->
<template>
  <div class="announcement-bar" :style="barStyle">
    <span>{{ announcement.text }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  announcement: {
    type: Object,
    required: true,
    default: () => ({
      enabled: false,
      text: '',
      bg_color: '#000000',
      text_color: '#ffffff'
    })
  }
})

const barStyle = computed(() => ({
  backgroundColor: props.announcement?.bg_color || '#000000',
  color: props.announcement?.text_color || '#ffffff'
}))
</script>

<style scoped>
.announcement-bar {
  width: 100%;
  padding: 8px 16px;
  text-align: center;
  font-size: 14px;
  line-height: 1.4;
}
</style>