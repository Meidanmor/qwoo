<template>
  <div class="container q-pa-md forgot-password-page">
    <h2>Forgot your password?</h2>

    <div v-if="sent" class="sent-msg">
      <p>{{ message }}</p>
      <router-link to="/my-account">Back to login</router-link>
    </div>

    <q-form v-else @submit.prevent="submit" class="account-login-wrap">
      <p class="hint">Enter your username or email and we'll send you a link to reset your password.</p>

      <!-- Honeypot: real users never see or fill this. -->
      <div class="hp-field" aria-hidden="true">
        <label for="forgot-website">Website</label>
        <input
            id="forgot-website"
            v-model="honeypotField"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
        />
      </div>

      <q-input
          v-model="username"
          label="Username or Email"
          filled
          :disable="loading"
      />

      <q-btn
          label="Send reset link"
          type="submit"
          color="secondary"
          :loading="loading"
      />

      <div v-if="error" class="text-negative q-mt-md">{{ error }}</div>

      <div class="q-mt-md">
        <router-link to="/my-account">Back to login</router-link>
      </div>
    </q-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useHoneypot } from 'src/composables/useHoneypot.js'
import {useSeoMeta} from "src/composables/useSeo.js";

defineOptions({
  async preFetch ({ ssrContext }) {
    const seo = {
      title: 'Forgot password',
      description: 'Forgot password page',
      robots: 'noindex, follow'
    }

    if (ssrContext) {
      ssrContext.seoData = seo
    } else {
      window.__SEO_DATA__ = seo
    }

  }
})
useSeoMeta()

const username = ref('')
const error    = ref('')
const loading  = ref(false)
const sent     = ref(false)
const message  = ref('')
const { honeypotField, isLikelyBot } = useHoneypot()

async function submit() {
  error.value = ''

  // Bot trap — skip hitting the endpoint at all (no point spending a
  // rate-limit slot or triggering an email send), but show the exact
  // same generic success state a real submission would get, so a bot
  // can't tell it was caught.
  if (isLikelyBot()) {
    message.value = "If an account matches that, we've sent a password reset link to it."
    sent.value = true
    return
  }

  loading.value = true

  try {
    const res = await fetch('/wp-json/qwoo/v1/forgot-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value }),
    })
    const data = await res.json()

    // The endpoint always returns success:true (whether or not an account
    // matched) to avoid leaking which usernames/emails are registered.
    message.value = data.message || "If an account matches that, we've sent a password reset link to it."
    sent.value = true
  } catch (err) {
    console.error('Forgot password error:', err)
    error.value = 'A server error occurred. Please try again later.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.account-login-wrap {
  padding: 10px;
  border: 1px solid var(--q-text);
  border-radius: 4px;
  margin-top: 20px;
}
.account-login-wrap :deep(.q-input) {
  margin-bottom: 10px;
}
.hint {
  opacity: .7;
  font-size: 14px;
}
.sent-msg {
  margin-top: 20px;
}
</style>