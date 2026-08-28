<template>
  <div class="container q-pa-md reset-password-page">
    <h2>Reset your password</h2>

    <div v-if="!key || !login" class="text-negative q-mt-md">
      This link is missing information and can't be used. Please request a new reset link.
      <div class="q-mt-sm">
        <router-link to="/forgot-password">Request a new link</router-link>
      </div>
    </div>

    <div v-else-if="done" class="sent-msg">
      <p>Your password has been reset.</p>
      <router-link to="/my-account">Log in</router-link>
    </div>

    <q-form v-else @submit.prevent="submit" class="account-login-wrap">
      <q-input
          v-model="password"
          type="password"
          label="New password"
          filled
          :disable="loading"
          hint="At least 8 characters"
      />
      <q-input
          v-model="confirmPassword"
          type="password"
          label="Confirm new password"
          filled
          :disable="loading"
      />

      <q-btn
          label="Reset password"
          type="submit"
          color="secondary"
          :loading="loading"
      />

      <div v-if="error" class="text-negative q-mt-md">{{ error }}</div>
    </q-form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {useSeoMeta} from "src/composables/useSeo.js";

defineOptions({
  async preFetch ({ ssrContext }) {
    const seo = {
      title: 'Reset password',
      description: 'Reset password page',
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

const route = useRoute()
const key   = computed(() => route.query.key || '')
const login = computed(() => route.query.login || '')

const password        = ref('')
const confirmPassword = ref('')
const error           = ref('')
const loading         = ref(false)
const done            = ref(false)

async function submit() {
  error.value = ''

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }

  loading.value = true
  try {
    const res = await fetch('/wp-json/qwoo/v1/reset-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: key.value,
        login: login.value,
        password: password.value,
      }),
    })
    const data = await res.json()

    if (!data.success) {
      error.value = data.message || 'Could not reset your password. Please try again.'
      return
    }

    done.value = true
  } catch (err) {
    console.error('Reset password error:', err)
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
.sent-msg {
  margin-top: 20px;
}
</style>