// src/stores/user.js
import { reactive, computed } from 'vue'
import { clearCartToken } from 'src/composables/useApiFetch.js'

// Helper to safely get data only on the client
const getInitialUser = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem('user_session')
      return saved ? JSON.parse(saved) : {}
    } catch (e) {
      console.warn('Failed to parse user_session', e)
      return {}
    }
  }
  return {}
}

export const userState = reactive({
  data: getInitialUser(),
})

export const isAdmin = computed(() => !!userState.data?.is_super_admin)
export const isLoggedIn = computed(() => !!userState.data?.id)

export function setUser(userData) {
  userState.data = userData || {}
  // Only write to localStorage if we are in the browser
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_session', JSON.stringify(userState.data))
  }
}

export function clearUser() {
  userState.data = {}
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user_session')
    localStorage.removeItem('checkout_form')
    clearCartToken()
  }
}

/* -------------------------
   Cross-tab sync — cart.js and wishlist.js already do this; user.js was
   missing it, which meant logging out in one tab left other open tabs
   still showing the old logged-in user until their next full reload.
------------------------- */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== 'user_session') return
    try {
      userState.data = e.newValue ? JSON.parse(e.newValue) : {}
    } catch {
      userState.data = {}
    }
  })
}