<template>
  <transition name="fade">
    <div v-if="visible" class="cookie-banner">
      <div class="cookie-text">
        We use cookies to improve your experience on our website.
      </div>

      <div class="cookie-actions">
        <q-btn
          flat
          no-caps
          label="Privacy Policy"
          to="/privacy-policy"
          color="secondary"
        />

        <q-btn
          unelevated
          no-caps
          color="secondary"
          label="Accept"
          @click="acceptCookies"
        />
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const visible = ref(false)

onMounted(() => {
  const accepted = localStorage.getItem('cookie_consent')
  if (!accepted) visible.value = true
})

function acceptCookies() {
  localStorage.setItem('cookie_consent', 'accepted')
  visible.value = false
}
</script>