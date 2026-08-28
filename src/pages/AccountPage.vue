<!-- AccountPage.vue -->
<template>
  <div class="q-pa-md">
    <div class="container">
      <h2>My account</h2>

      <!-- Checking session on mount -->
      <div v-if="sessionLoading">
        <q-spinner color="secondary" size="2em" />
      </div>

      <!-- Not logged in -->
      <div class="account-login-container" v-else-if="!isLoggedIn">
        <LoginForm @login-success="onLogin" />
        <span class="flex q-mb-sm q-mt-sm text-h6" v-if="googleLoginEnabled">OR</span>
        <GoogleLoginButton @login-success="onLogin"/>
      </div>

      <!-- Logged in -->
      <div v-else>
        <q-tabs
            @pointerdown.stop
          :right-icon="matChevronRight"
          :left-icon="matChevronLeft"
            :outside-arrows="true"
            :mobile-arrows="true"
          v-model="tab"
          class="account-tabs text-secondary"
          active-bg-color="secondary"
          active-color="primary"
          align="justify"
        >
          <q-tab name="dashboard" label="Dashboard" />
          <q-tab name="orders"    label="My Orders" />
          <q-tab name="details"   label="Account Details" />
          <q-tab name="logout"    label="Logout" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated>

          <q-tab-panel name="dashboard">
            <h2 class="text-h4">Dashboard</h2>
            <div v-if="userData">
              Welcome, {{ userData.first_name }} {{ userData.last_name }}
            </div>
            <div v-else>
              <q-spinner color="secondary" size="2em" />
            </div>
          </q-tab-panel>

          <q-tab-panel name="orders">
            <OrdersSection />
          </q-tab-panel>

          <q-tab-panel name="details">
            <AccountDetails v-if="userData" :user="userData" />
          </q-tab-panel>

          <q-tab-panel name="logout">
            <q-btn @click="logout" :loading="logoutLoading" label="Logout" />
            <div v-if="logoutError" class="text-negative q-mt-md">{{ logoutError }}</div>
          </q-tab-panel>

        </q-tab-panels>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchWithToken, setLoggedIn, getWasLoggedIn } from 'src/composables/useApiFetch.js'
import { clearSessionState } from 'src/composables/useSessionCleanup.js'
import { setUser } from 'src/stores/user.js'
import LoginForm          from '../components/account/LoginForm.vue'
import OrdersSection      from '../components/account/OrdersSection.vue'
import AccountDetails     from '../components/account/AccountDetails.vue'
import GoogleLoginButton  from '../components/account/GoogleLoginButton.vue'
import { matChevronLeft, matChevronRight } from '@quasar/extras/material-icons'
import {useSeoMeta} from "src/composables/useSeo.js";

defineOptions({
  async preFetch ({ ssrContext }) {

    const seo = {
      title: 'My account',
      description: 'Account page',
      robots: 'index, follow'
    }

    if (ssrContext) {
      // Initialize the state object if it doesn't exist
      ssrContext.seoData = seo
    } else {
      window.__SEO_DATA__ = seo;
    }
  }
})

useSeoMeta()

const googleLoginEnabled = !!import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID

const tab            = ref('dashboard')
const userData       = ref(null)
const isLoggedIn     = ref(false)
const sessionLoading = ref(true)
const logoutLoading  = ref(false)
const logoutError    = ref('')

let sessionChecked = false
onMounted(async () => {
  if (sessionChecked) return
  sessionChecked = true

  if (!getWasLoggedIn()) {
    sessionLoading.value = false
    return
  }

  try {
    const res = await fetchWithToken('/wp-json/qwoo/v1/me')
    if (res.ok) {
      const data = await res.json()
      userData.value  = data.user
      setUser(data.user)
      setLoggedIn(true)
      isLoggedIn.value = true
    } else {
      clearSessionState()
    }
  } catch (err) {
    console.error('Session check failed:', err)
    clearSessionState()
  } finally {
    sessionLoading.value = false
  }
})

function onLogin(user) {
  userData.value  = user
  setUser(user)
  setLoggedIn(true)
  isLoggedIn.value = true
}

async function logout() {
  logoutError.value   = ''
  logoutLoading.value = true

  try {
    await fetchWithToken('/wp-json/qwoo/v1/logout', { method: 'POST' })
  } catch (err) {
    console.error('Logout request failed:', err)
    logoutError.value = 'Logout failed. Please try again.'
    return
  } finally {
    logoutLoading.value = false
  }

  userData.value   = null
  isLoggedIn.value = false
  clearSessionState()
}
</script>
<style>
.q-tab-panels.q-panel-parent {
  overflow: hidden;
}
.account-tabs.q-tabs.q-tabs--scrollable.q-tabs--horizontal {
  overflow: hidden
}
.account-tabs.q-tabs.q-tabs__arrows--outside.q-tabs--horizontal.q-tabs--scrollable {
  padding-right: 26px;
  padding-left: 26px;
}
.account-tabs .q-tabs__content.scroll--mobile.row.no-wrap.items-center.self-stretch {
  overflow: auto;
}
.account-tabs i.q-icon.q-tabs__arrow.q-tabs__arrow--left {
  transform: translateX(-10px);
}
.account-tabs i.q-icon.q-tabs__arrow.q-tabs__arrow--right {
  transform: translateX(10px);
}
</style>