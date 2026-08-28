<template>
  <div class="account-login-wrap">
  <q-form @submit.prevent="login">
    <!-- Honeypot: real users never see or fill this. -->
    <div class="hp-field" aria-hidden="true">
      <label for="login-website">Website</label>
      <input
          id="login-website"
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
    <q-input
        v-model="password"
        type="password"
        label="Password"
        filled
        :disable="loading"
    />

    <div class="login-row">
      <q-checkbox v-model="remember" label="Remember me" :disable="loading" color="secondary" dense />
      <router-link to="/forgot-password" class="forgot-link">Forgot password?</router-link>
    </div>

    <q-btn
        label="Login"
        type="submit"
        color="secondary"
        :loading="loading"
    />

    <div v-if="error" class="text-negative q-mt-md">{{ error }}</div>
  </q-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'
import { setUser } from 'src/stores/user.js'
import { useHoneypot } from 'src/composables/useHoneypot.js'

const username = ref('')
const password = ref('')
const remember  = ref(false)
const error    = ref('')
const loading  = ref(false)
const { honeypotField, isLikelyBot } = useHoneypot()

const emit = defineEmits(['login-success'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

// All requests use credentials: 'include' so WP session cookies are sent.
// No Authorization header, no token storage.
function apiFetch(path, options = {}) {
  return fetch(`/wp-json/${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function login() {
  error.value   = ''

  // Bot trap — same generic message a real failed login would show,
  // so an automated submission gets no signal it was caught by a
  // different check than a wrong password.
  if (isLikelyBot()) {
    error.value = 'Login failed. Please try again.'
    return
  }

  loading.value = true

  try {
    // 1. Call our custom login endpoint
    const res  = await apiFetch('qwoo/v1/login', {
      method: 'POST',
      body: JSON.stringify({
        username: username.value,
        password: password.value,
        remember: remember.value,
      }),
    })
    const data = await res.json()

    // 2. Handle login errors returned from the endpoint
    if (!data.success) {
      error.value = data.message || 'Login failed. Please try again.'
      return
    }

    setUser(data.user)

    const nonceRes = await apiFetch('qwoo/v1/nonce', {
      credentials: 'include'
    })

    if(nonceRes.ok){
      const nonceVal = await nonceRes.json();
      if(nonceVal.nonce){
        localStorage.setItem('wp_nonce', nonceVal.nonce)
      }
    }
    // 4. Merge the guest cart and wishlist into the now-authenticated session.
    //    Both merge functions fetch a fresh server snapshot themselves (the
    //    session cookie is set by now, so the Store API / wishlist endpoint
    //    see the logged-in user automatically) and preserve any items that
    //    already existed on the account — nothing gets silently overwritten
    //    or dropped in either direction.
    await cart.mergeLocalCartWithServer()
    await wishlist.mergeGuestWishlistOnLogin()

    // 5. Notify parent — pass user data, not a token
    emit('login-success', data.user)

  } catch (err) {
    console.error('Login error:', err)
    error.value = 'A server error occurred. Please try again later.'
  } finally {
    loading.value = false
  }
}
</script>
<style scoped>
/* purgecss start ignore */
.q-field__label {
  transition: 0.3s ease;
}
.q-field--focused .q-field__label,
.q-field--float .q-field__label {
  font-size: 10px;
  transform: translateY(-5px);
}
div.q-tab-panels {
  background: transparent;
}
.account-login-wrap {
  padding: 10px;
  border: 1px solid var(--q-text);
  border-radius: 4px;
  margin-top: 20px;
}
.account-login-wrap :deep(.q-input) {
  margin-bottom: 10px;
}
.login-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.login-row .forgot-link {
  color: var(--q-secondary);
  font-size: 13px;
  text-decoration: none;
}
.login-row .forgot-link:hover {
  text-decoration: underline;
}
.account-login-wrap > span {
  color: var(--q-text);
  display: flex;
  align-items: center;
  column-gap: 10px;
  flex-wrap: nowrap;
  padding: 10px 0;
  font-size: 20px;
}
.account-login-wrap > span:before,
.account-login-wrap > span:after {
  content: '';
  position: relative;
  width: 100%;
  height: 1px;
  background: var(--q-text);
  display: block;
}
.account-login-wrap .google-login-btn-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
}
.account-login-wrap :deep(.google-login-btn-wrap button) {
  width: 100%;
  max-width: 400px;
}
/* purgecss end ignore */
</style>