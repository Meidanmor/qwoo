<template>
  <q-layout view="hHh lpR fFf">
    <AnnouncementBar v-if="headerSettings?.announcement?.enabled && (typeof headerSettings?.announcement?.text === 'string' && headerSettings.announcement.text.trim().length > 0)" :announcement="headerSettings?.announcement" />

    <AppHeader
        :is-super-admin="isSuperAdmin"
        @open-menu="mobileMenuDrawer = true"
        @toggle-cart="toggleCart()"
        @toggle-wishlist="toggleWishlistDrawer"
        :app-logo="brandSettings?.logo"
    />
    <!-- Mobile Navigation Drawer -->
    <q-drawer
        ref="mobileDrawerEl"
        v-model="mobileMenuDrawer"
        side="left"
        overlay
        behavior="mobile"
        :width="drawerWidth"
        transition-show="slide-right"
        transition-hide="slide-left"
        :touch-area-width="250"
        v-if="uiHydrated"
    >
      <MobileNavDrawer
          :supported="supported"
          :permission="permission"
          :is-super-admin="isSuperAdmin"
          @close="mobileMenuDrawer = false"
          @subscribe="handleSubscribe"
      />

    </q-drawer>

    <!-- Wishlist Drawer -->
    <q-drawer
        v-model="wishlistDrawerOpen"
        side="right"
        overlay
        :width="drawerWidth"
        behavior="mobile"
        v-if="uiHydrated"
    >
      <WishlistDrawer
          @toggle-wishlist="toggleWishlistDrawer"
      />
    </q-drawer>
    <!-------------- ------->
    <q-drawer
        ref="cartDrawerEl"
        v-model="cartDrawer"
        side="right"
        overlay
        behavior="mobile"
        :width="drawerWidth"
        class="cart-drawer"
        :touch-area-width="250"
        v-if="uiHydrated"
    >
      <CartDrawer
          @toggle-cart="toggleCart()"
      />
    </q-drawer>

    <q-page-container style="padding-top: 0">
      <main>
        <router-view />
      </main>
    </q-page-container>

    <AppFooter
        :footer-text="footerSettings?.footer_text"
    />

    <CookieBanner v-if="uiHydrated" />
    <ContactButton v-if="uiHydrated" />

    <NotificationSoftAskModal
        v-if="uiHydrated"
        :model-value="notificationSoftAskVisible"
        @enable="handleSoftAskEnable"
        @dismiss="dismissNotificationSoftAsk"
    />

  </q-layout>
</template>

<script setup>
import {ref, computed, watch, onMounted, onUnmounted, useSSRContext} from 'vue'
import { loadPageConfig } from 'src/utils/config-loader'
import { useQuasar } from 'quasar'
import cart from 'src/stores/cart'
import wishlist from 'src/stores/wishlist'
import { isAdmin } from 'src/stores/user'
import WishlistDrawer from '../components/app/WishlistDrawer.vue'
import CartDrawer from '../components/app/CartDrawer.vue'
import MobileNavDrawer from '../components/app/MobileNavDrawer.vue'
import AppHeader from '../components/app/AppHeader.vue'
import AppFooter from '../components/app/AppFooter.vue'
import AnnouncementBar from '../components/app/AnnouncementBar.vue'
import { useRoute, useRouter } from 'vue-router'
import { Platform } from 'quasar';
import CookieBanner from "../components/app/CookieBanner.vue";
import ContactButton from "../components/app/ContactButton.vue";
import initPush, { subscribeToWebPush, initNativePush, checkNativePermission } from 'src/services/push/push.js'
import { initLoadingBar } from 'src/composables/useLoadingBar.js'
import { initAuthPopup } from 'src/composables/useAuthExpired.js'
import { initSessionWatcher } from 'src/composables/useSessionWatcher.js'
import {
  initNotificationSoftAskTracking,
  showNotificationSoftAsk,
  dismissNotificationSoftAsk
} from 'src/composables/useNotificationSoftAsk.js'
import NotificationSoftAskModal from 'src/components/app/NotificationSoftAskModal.vue'
import {getApiOrigin} from "src/utils/server/get-api-origin.js";
import {
  matWifi,
  matSignalWifiOff,
  matError } from '@quasar/extras/material-icons'

// Inside your Page or Layout
defineOptions({
  async preFetch ({ ssrContext, currentRoute }) {

    const siteURL = getApiOrigin(ssrContext) || '';
    const { resolveHeroImageSrc } = await import('src/utils/resolve-hero-image')

    // Fire both requests at the same time
    const isPreview = currentRoute.query.preview === 'true'

    const configData = await loadPageConfig('branding', isPreview, siteURL)

    const headerConfig = await loadPageConfig('header', isPreview, siteURL);
    const footerConfig = await loadPageConfig('footer', isPreview, siteURL);
    if (configData) {
      configData.logo = await resolveHeroImageSrc(configData.logo, "branding", siteURL)
    }

    if (ssrContext) {
      ssrContext.brandConfig = configData
      ssrContext.headerConfig = headerConfig
      ssrContext.footerConfig = footerConfig

    } else {
      window.__BRAND_CONFIG__ = configData;
      window.__HEADER_CONFIG__ = headerConfig;
      window.__FOOTER_CONFIG__ = footerConfig;
    }
  }
})

const brandSettings = ref(
    process.env.CLIENT && window.__BRAND_CONFIG__
        ? window.__BRAND_CONFIG__
        : null
)
const headerSettings = ref(
    process.env.CLIENT && window.__HEADER_CONFIG__
        ? window.__HEADER_CONFIG__
        : null
)

const footerSettings = ref(
    process.env.CLIENT && window.__FOOTER_CONFIG__
        ? window.__FOOTER_CONFIG__
        : null
)

if (process.env.SERVER) {
  const ssr = useSSRContext()
  brandSettings.value = ssr?.brandConfig || null
  headerSettings.value = ssr?.headerConfig || null
  footerSettings.value = ssr?.footerConfig || null
}

async function hideSplash() {
  if (!Platform.is.capacitor) return
  try {
    const {SplashScreen} = await import(/* @vite-ignore */ '@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 500 })
  } catch (err) {
    console.warn('SplashScreen hide failed', err)
  }
}

function normalizePermission(value) {
  if (value === 'prompt') { return 'default' } else if (value === 'initialized') { return 'granted' }
  return value
}
/* eslint-disable no-unused-vars */
const _responsiveClasses = 'gt-sm lt-md gt-md lt-sm'
/* eslint-enable no-unused-vars */

const permission = ref('default')
const supported = ref(false)
const vapidConfigured = !!import.meta.env.VITE_VAPID_APP_PUBLIC_KEY
const notificationSoftAskVisible = computed(() =>
    vapidConfigured && supported.value && permission.value === 'default' && showNotificationSoftAsk.value
)
const isSuperAdmin = isAdmin
const $q = useQuasar()
const mobileMenuDrawer = ref(false)

const wishlistDrawerOpen = ref(false)
const cartDrawer = ref(false)
const drawerWidth = computed(() => Math.min(400, $q.screen.width * 0.9))
const toggleCart = () => (cartDrawer.value = !cartDrawer.value)
const toggleWishlistDrawer = () => (wishlistDrawerOpen.value = !wishlistDrawerOpen.value)

const mobileDrawerEl = ref(null)
const cartDrawerEl = ref(null)

let startX = 0
let startY = 0
let currentX = 0
let dragging = false
let activeDrawer = null // 'left' | 'right'
let activeEl = null
let activeAside = null
let activeBackdrop = null
let activePointerId = null

const DRAG_ACTIVATION_DISTANCE = 10
const OPEN_THRESHOLD_RATIO = 0.35
const MAX_BACKDROP_OPACITY = 0.4 // matches Quasar's own default overlay darkness

const getEl = (r) => r?.value?.$el || null
const getAside = (el) => el?.querySelector('aside') || null
const getBackdrop = (el) => el?.querySelector('.q-drawer__backdrop') || null

const resetDrag = (el) => {
  if (!el) return
  const aside = getAside(el)
  const backdrop = getBackdrop(el)
  if (aside) {
    aside.style.transition = ''
    aside.style.transform = ''
    aside.style.visibility = ''
  }
  if (backdrop) {
    backdrop.style.transition = ''
    backdrop.style.backgroundColor = ''
  }
}

const handlePointerDown = (e) => {
  // Only left mouse button, ignore right-click/middle-click
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (mobileMenuDrawer.value || cartDrawer.value || wishlistDrawerOpen.value) return

  startX = e.clientX
  startY = e.clientY
  currentX = startX
  dragging = false
  activeDrawer = null
  activeEl = null
  activeAside = null
  activeBackdrop = null
  activePointerId = e.pointerId
}

const handlePointerMove = (e) => {
  if (activePointerId === null || e.pointerId !== activePointerId) return
  if (mobileMenuDrawer.value || cartDrawer.value || wishlistDrawerOpen.value) return

  const dx = e.clientX - startX
  const dy = e.clientY - startY

  if (!dragging) {
    if (Math.abs(dx) < DRAG_ACTIVATION_DISTANCE) return
    if (Math.abs(dy) > Math.abs(dx)) return // vertical scroll, bail

    dragging = true
    activeDrawer = dx > 0 ? 'left' : 'right'
    activeEl = activeDrawer === 'left' ? getEl(mobileDrawerEl) : getEl(cartDrawerEl)
    activeAside = getAside(activeEl)
    activeBackdrop = getBackdrop(activeEl)
    if (activeAside) activeAside.style.transition = 'none'
    if (activeBackdrop) {
      activeBackdrop.style.transition = 'none'
      activeBackdrop.style.display = '' // in case Quasar sets display:none when closed
    }
  }

  if (!dragging || !activeEl) return

  e.preventDefault()
  currentX = e.clientX

  const width = drawerWidth.value
  const dist = Math.min(width, Math.max(0, Math.abs(dx)))
  const progress = dist / width // 0 → 1
  const translate = activeDrawer === 'left' ? dist - width : width - dist
  activeAside.style.transform = `translateX(${translate}px)`
  activeAside.style.visibility = 'visible'

  if (activeBackdrop) {
    activeBackdrop.style.backgroundColor = `rgba(0,0,0,${(progress * MAX_BACKDROP_OPACITY).toFixed(3)})`
    activeBackdrop.classList.remove('hidden')

  }
}

const handlePointerUp = (e) => {
  if (activePointerId === null || e.pointerId !== activePointerId) return
  activePointerId = null

  if (!dragging || !activeEl) {
    dragging = false
    return
  }

  const dist = Math.abs(currentX - startX)
  const width = drawerWidth.value
  const shouldOpen = dist > width * OPEN_THRESHOLD_RATIO
  const el = activeEl
  const drawer = activeDrawer
  activeBackdrop = getBackdrop(el)

  el.querySelector('aside').style.transition = 'transform 0.2s ease-out'
  if (activeBackdrop) activeBackdrop.style.transition = 'background-color 0.2s ease-out'

  if (shouldOpen) {
    el.querySelector('aside').style.transform = 'translateX(0)'
    if (activeBackdrop) activeBackdrop.style.backgroundColor = `rgba(0,0,0,${MAX_BACKDROP_OPACITY})`

    // only the cleanup waits for the CSS transition to visually finish
    resetDrag(el)

    if (drawer === 'left') mobileMenuDrawer.value = true
      else cartDrawer.value = true
  } else {
    el.querySelector('aside').style.transform = drawer === 'left' ? `translateX(-${width}px)` : `translateX(${width}px)`
    if (activeBackdrop) {
      activeBackdrop.style.backgroundColor = 'rgba(0,0,0,0)'
      activeBackdrop.classList.add('hidden')

    }
    setTimeout(() => resetDrag(el), 200)
  }

  dragging = false
  activeDrawer = null
  activeEl = null
}
const handlePointerCancel = (e) => {
  if (activePointerId === null || e.pointerId !== activePointerId) return
  activePointerId = null

  if (dragging && activeEl) {
    resetDrag(activeEl) // snap back to whatever state it was in, don't leave it stranded
  }

  dragging = false
  activeDrawer = null
  activeEl = null
  activeAside = null
  activeBackdrop = null
}


async function handleSubscribe() {
  if (Platform.is.capacitor) {
    try {
      // request permission via the boot helper (user gesture)
      const result = await initNativePush()
      permission.value = normalizePermission(result)
      //alert('Permission status: ' + result)
    } catch (e) {
      console.error('Native permission error', e)
    }
  } else {
    await subscribeToWebPush()
    permission.value = Notification.permission
  }
}

async function handleSoftAskEnable() {
  await handleSubscribe()
  dismissNotificationSoftAsk()
}

const uiHydrated = ref(false)              // Deferred functional UI
const route = useRoute()
const router = useRouter()

const noDelayRoutes = ['/checkout/', '/cart/', '/my-account/']

const shouldDelayHydration = computed(() => {
  return !noDelayRoutes.includes(route.path)
})

const initConnectivityListeners = () => {
  if (window.__CONNECTIVITY_INITIALIZED__) return
  window.__CONNECTIVITY_INITIALIZED__ = true

  let wasOffline = !navigator.onLine

  const updateOnlineStatus = async (isOnline) => {
    const becameOnline  = isOnline && wasOffline
    const becameOffline = !isOnline && !wasOffline

    if (!becameOnline && !becameOffline) return  // no actual state change, bail early

    wasOffline = !isOnline
    cart.state.offline = !isOnline

    if (becameOnline) {
      $q.notify({ type: 'positive', message: 'You are back online!', icon: matWifi, timeout: 3000 })
      await cart.fetchCart()
      await wishlist.fetchWishlistItems()
    } else {
      $q.notify({ type: 'warning', message: 'You are offline. Some features may be limited.', icon: matSignalWifiOff, timeout: 3000 })
    }
  }

  window.addEventListener('online',  () => updateOnlineStatus(true))
  window.addEventListener('offline', () => updateOnlineStatus(false))
  // Catches physical network changes (WiFi toggle) that window events miss

  navigator.serviceWorker.addEventListener('message', ({ data }) => {
    if (data.type === 'OFFLINE') {
      updateOnlineStatus(false)
    } else if (data.type === 'ONLINE'){
      updateOnlineStatus(true)
    }
  });

  navigator.connection?.addEventListener('change', async () => {
    try {
      await fetch(window.location.origin, {method: 'HEAD', cache: 'no-store'})
      updateOnlineStatus(true)
    } catch {
      updateOnlineStatus(false)
    }
  })

}

onMounted(async () => {
  initSessionWatcher()

  const isPreview = route.query.preview === 'true'

  if (window.__BRAND_CONFIG__ && Object.keys(window.__BRAND_CONFIG__).length) {
    brandSettings.value = window.__BRAND_CONFIG__
  } else {
    // Use it directly
    const freshConfig = await loadPageConfig('branding', isPreview)
    if (freshConfig) brandSettings.value = freshConfig
  }
  if (window.__HEADER_CONFIG__ && Object.keys(window.__HEADER_CONFIG__).length) {
    headerSettings.value = window.__HEADER_CONFIG__
  } else {
    // Use it directly
    const freshHeaderConfig = await loadPageConfig('header', isPreview)
    if (freshHeaderConfig) headerSettings.value = freshHeaderConfig
  }
  if (window.__FOOTER_CONFIG__ && Object.keys(window.__FOOTER_CONFIG__).length) {
    footerSettings.value = window.__FOOTER_CONFIG__
  } else {
    // Use it directly
    const freshFooterConfig = await loadPageConfig('footer', isPreview)
    if (freshFooterConfig) footerSettings.value = freshFooterConfig
  }

  if (!('serviceWorker' in navigator)) return
  const warm = () => {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({ type: 'UPDATE_SW' })
      registration.active?.postMessage({ type: 'WARM_PRODUCTS_CACHE' })
    })
  }

  await router.isReady()

  const scheduler = async () => {
    if (uiHydrated.value) return
    window.removeEventListener('scroll', scheduler)
    window.removeEventListener('mousemove', scheduler)
    window.removeEventListener('touchstart', scheduler)


    try {
      requestAnimationFrame(() => {
        uiHydrated.value = true
        hideSplash()
        initConnectivityListeners()
        warm()

        cart.fetchCartOnce()
        initLoadingBar(router)
        initAuthPopup(router)
        if (vapidConfigured) initNotificationSoftAskTracking(router)

        initPush({router})

        if (Platform.is.capacitor) {
          supported.value = true
          // keep only the native check, remove the web Notification.permission line below
          checkNativePermission().then(initialPermissions => {
            permission.value = normalizePermission(initialPermissions)
          })
        } else if ('Notification' in window) {
          const perm = normalizePermission(Notification.permission)
          permission.value = perm
          // If already granted, no need to show the banner or check incognito
          if (perm !== 'granted') {
            supported.value = true
          }
        }
        window.addEventListener('pointerdown', handlePointerDown, { passive: true })
        window.addEventListener('pointermove', handlePointerMove, { passive: false })
        window.addEventListener('pointerup', handlePointerUp, { passive: true })
        window.addEventListener('pointercancel', handlePointerCancel, { passive: true })
      })

    } catch (e) {
      console.error('Hydration prefetch failed', e)
      uiHydrated.value = true
    }

  }

  // Define headerBtnClick after scheduler so it can reference it
  const headerBtnClick = async (e) => {
    await scheduler()
    const btn = e.target.closest('[aria-label]')
    if (btn) {
      const label = btn.getAttribute('aria-label')
      requestAnimationFrame(() => {
        if (label === 'Open menu') mobileMenuDrawer.value = true
        else if (label === 'Add to wishlist') wishlistDrawerOpen.value = true
        else if (label === 'View cart') cartDrawer.value = true
      })
    }
  }

  document.querySelector('header').addEventListener('click', headerBtnClick, { passive: true })

  if (!shouldDelayHydration.value) {
    scheduler()
  } else {
    const cleanup = () => {
      window.removeEventListener('scroll', scheduler)
      window.removeEventListener('mousemove', scheduler)
      window.removeEventListener('touchstart', scheduler)
      clearTimeout(fallbackTimer)
    }

    const fallbackTimer = setTimeout(() => {
      cleanup()
      scheduler()
    }, 5000)

    window.addEventListener('scroll', scheduler, { passive: true })
    window.addEventListener('mousemove', scheduler, { passive: true })
    window.addEventListener('touchstart', scheduler, { passive: true })
  }
})
onUnmounted(() => {
  // Critical cleanup
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerCancel)

})
watch(() => cart.state.drawerOpen, val => {
  if(val === true) {
    cartDrawer.value = val;
    cart.state.drawerOpen = false;
    //cart.fetchCart()
  }
})
watch(
    () => cart.state.rejected_items,
    (rejected) => {
      if (rejected?.length) {
        rejected.forEach(item => {
          $q.notify({
            type: 'warning',
            message: `"${item.name}" was removed — no longer available`,
            icon: matError,
            timeout: 8000
          })
        })
      }
    }
)

</script>