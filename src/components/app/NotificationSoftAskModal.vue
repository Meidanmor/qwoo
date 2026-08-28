<template>
  <q-dialog
      :model-value="modelValue"
      @update:model-value="(val) => !val && emit('dismiss')"
      position="bottom"
      seamless
  >
    <q-card class="notification-soft-ask q-pa-md" style="max-width: 420px; width: 100%;background-color: #ffffff">
      <q-card-section class="row items-center q-pb-none">
        <q-icon :name="matNotificationsActive" color="secondary" size="28px" class="q-mr-sm" />
        <div class="text-h6">Never miss an update</div>
      </q-card-section>

      <q-card-section class="text-body2 text-grey-8">
        Turn on notifications to hear about order updates, price drops, and abandoned cart reminders — you can turn them off anytime.
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps color="grey-7" label="Not now" @click="emit('dismiss')" />
        <q-btn unelevated no-caps color="secondary" label="Enable notifications" @click="emit('enable')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { matNotificationsActive } from '@quasar/extras/material-icons'

defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['enable', 'dismiss'])
</script>