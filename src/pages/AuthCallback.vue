<template>
  <q-page class="q-pa-md flex flex-center">
    <q-spinner size="3em" color="secondary" />
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import cart from 'src/stores/cart.js'
import { setLoggedIn, refreshNonce } from 'src/composables/useApiFetch.js'
import wishlist from 'src/stores/wishlist.js'
import { setUser } from 'src/stores/user.js'

const router = useRouter()

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  let state = params.get('state') || '/'

  if (!code) {
    console.error('No code returned from Google')
    router.replace('/')
    return
  }

  try {
    const res = await fetch('/wp-json/qwoo/v1/google-login-redirect', {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({code})
    })

    const data = await res.json()

    if (data.success) {
      if (data.user) setUser(data.user)
      setLoggedIn(true)
      await refreshNonce()
      await cart.mergeLocalCartWithServer()
      await wishlist.mergeGuestWishlistOnLogin()

// If state contains full URL, extract just the pathname
      try {
        if (state.startsWith('http')) {
          const url = new URL(state)
          state = url.pathname + url.search + url.hash
        }
      } catch (e) {
        if(e.data){
          console.warn(e.data);
        }
        console.warn('Invalid state URL, fallback to /')
        state = '/'
      }

      // Redirect to original page from state, fallback to homepage
      router.replace(state)
    } else {
      console.error('Google redirect login failed', data)
      router.replace('/')
    }
  } catch (err) {
    console.error('Redirect login error', err)
    router.replace('/')
  }
})
</script>
