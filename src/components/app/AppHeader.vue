<template>
  <q-header class="sticky" style="padding: 5px 0;">
    <div class="container">
      <q-toolbar class="flex justify-between q-pa-sm">
        <div class="flex nav-items-el">
          <!-- Desktop Navigation -->
          <q-toolbar-title class="nav-bar gt-sm">
            <router-link to="/" class="text-h6 no-decoration">My Shop</router-link>
            <router-link to="/products/" class="text-h6 no-decoration">Products</router-link>
            <router-link to="/cart/" class="text-h6 no-decoration">Cart</router-link>
            <router-link to="/checkout/" class="text-h6 no-decoration">Checkout</router-link>
            <router-link to="/my-account/" class="text-h6 no-decoration">My account</router-link>
          </q-toolbar-title>

          <!-- Mobile Menu Toggle -->
          <q-btn flat dense :icon="matMenu" aria-label="Open menu" class="lt-md" @click="emit('open-menu')" />

        </div>
        <router-link to="/" aria-label="Navigate to home page" class="flex items-center order-first">
          <img alt="Q-Woo logo" :src="appLogo" width="84" height="19" loading="eager" decoding="sync" fetchpriority="high" />
        </router-link>
        <div>
          <q-btn flat dense :icon="matFavoriteBorder" aria-label="Add to wishlist" @click="emit('toggle-wishlist')" class="q-ml-sm q-mr-sm">
            <q-no-ssr>
              <q-badge v-if="wishlist.state.items && Object.keys(wishlist.state.items).length > 0" floating color="red">{{ Object.keys(wishlist.state.items).length }}</q-badge>
            </q-no-ssr>
          </q-btn>

          <q-btn flat dense :icon="matShoppingCart" aria-label="View cart" @click="emit('toggle-cart')">
            <q-no-ssr>
              <q-badge v-if="cart.state.items_count > 0" floating color="red">{{ cart.state.items_count }}</q-badge>
            </q-no-ssr>
          </q-btn>
        </div>
      </q-toolbar>
    </div>
  </q-header>
</template>

<script setup>
import { matShoppingCart,
  matFavoriteBorder,
  matMenu } from '@quasar/extras/material-icons'
import wishlist from 'src/stores/wishlist'
import cart from 'src/stores/cart'

defineProps({
  isSuperAdmin: {
    type: Boolean,
    required: true
  },
  appLogo: {
    type: String,
    default: '',
    required: true
  }
})

const emit = defineEmits([
  'open-menu',
  'toggle-cart',
  'toggle-wishlist'
])

</script>