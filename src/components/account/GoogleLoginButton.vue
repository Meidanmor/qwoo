<template>
  <div v-if="GOOGLE_WEB_CLIENT_ID" class="google-login-btn-wrap">
<q-btn
    label="Sign in with Google"
    color="primary"
    text-color="secondary"
    no-caps
    :loading="loading"
    @click="handleLogin"
  >
  <svg style="order:-1;margin-right:5px;" width="24px" height="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#EA4335" d="M12 10.2v4.02h5.62c-.24 1.3-.98 2.4-2.1 3.14l3.4 2.64c1.98-1.83 3.12-4.52 3.12-7.72 0-.73-.07-1.44-.19-2.08H12z"/>
  <path fill="#4285F4" d="M12 21c2.84 0 5.22-.94 6.96-2.54l-3.4-2.64c-.94.63-2.14 1.08-3.56 1.08-2.74 0-5.06-1.85-5.9-4.34l-3.52 2.71C4.32 18.67 7.87 21 12 21z"/>
  <path fill="#FBBC05" d="M6.1 12.56a5.9 5.9 0 0 1 0-3.12L2.58 6.73A10.5 10.5 0 0 0 1.5 12c0 1.69.4 3.29 1.08 4.73l3.52-2.71z"/>
  <path fill="#34A853" d="M12 5.1c1.55 0 2.94.53 4.03 1.58l3.02-3.02C17.21 2.01 14.83 1 12 1 7.87 1 4.32 3.33 2.58 6.73L6.1 9.44C6.94 6.95 9.26 5.1 12 5.1z"/>
</svg>
</q-btn>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { Platform } from 'quasar';
import { setLoggedIn, refreshNonce } from 'src/composables/useApiFetch.js'
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'

const emit = defineEmits(['login-success'])

// This is the "Web Application" Client ID from Google Console
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;

const loading = ref(false);
async function handleLogin() {
  loading.value = true;

  try {
    if (Platform.is.capacitor) {
      await handleNativeLogin();
    } else {
      redirectToGoogleLogin(); // Your existing web fallback
    }
  } catch (err) {
    console.error("Google login failed:", err);
    loading.value = false;
  }
}

async function handleNativeLogin() {

  // HARD SSR GUARD
  if (import.meta.env.SSR) {
    return;
  }
  // Guard: Only attempt this if we are actually on a mobile device/native app
  if (!Platform.is.capacitor) {
    console.warn('Native login not available on web.');
    // Trigger web-based login fallback here if you have one
    return;
  }
  // 1. Dynamic import so web builds don't break
  const { SocialLogin } = await import('@capgo/capacitor-social-login');

  // 2. Initialize (Must use WEB Client ID even on Android)
  await SocialLogin.initialize({
    google: {
      webClientId: GOOGLE_WEB_CLIENT_ID,
    },
  });

  // 3. Trigger Native Bottom Sheet
  const { result } = await SocialLogin.login({
    provider: 'google',
    options: {
      scopes: ['email', 'profile'],
    }
  });

  if (result.idToken) {
    await sendTokenToBackend(result.idToken);
  }
}

async function sendTokenToBackend(idToken) {
  try {
    const response = await fetch('/wp-json/qwoo/v1/google-login', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: idToken }),
    });
    const data = await response.json();

    if (data.success) {
      setLoggedIn(true)
      await refreshNonce() // this round-trip also confirms the cookie is live
      await cart.mergeLocalCartWithServer()
      await wishlist.mergeGuestWishlistOnLogin()

      emit('login-success', data.user) // mirror LoginForm instead of router.go(0)
    }
  } catch (error) {
    console.error("Backend sync failed:", error);
  } finally {
    loading.value = false;
  }
}

// Redirect fallback to Google OAuth
function redirectToGoogleLogin() {
  const redirectUri = `${window.location.origin}/auth/callback`; // must match Google app redirect URI
  const state = encodeURIComponent(window.location.href); // save current page

  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
              `client_id=${GOOGLE_WEB_CLIENT_ID}` +
              `&redirect_uri=${encodeURIComponent(redirectUri)}` +
              `&response_type=code` +
              `&scope=openid%20email%20profile` +
              `&state=${state}` +
              `&prompt=select_account`; // optional: forces account selection

  window.location.href = url;
}
</script>