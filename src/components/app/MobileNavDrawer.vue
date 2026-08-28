<template>
  <q-scroll-area class="fit">
    <div class="q-pa-md">
      <div class="text-h6 q-mb-md">Menu</div>

      <q-list bordered padding>
        <q-item
            v-if="isSuperAdmin"
            clickable
            v-ripple
            to="/admin"
            active-class="text-primary"
            @click="closeMenu"
        >
          <q-item-section avatar>
            <q-icon :name="matAdminPanelSettings" />
          </q-item-section>
          <q-item-section>Go to Admin Panel</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/" @click="closeMenu">
          <q-item-section avatar>
            <q-icon :name="matHome" />
          </q-item-section>
          <q-item-section>Home</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/products/" @click="closeMenu">
          <q-item-section avatar>
            <q-icon :name="matStorefront" />
          </q-item-section>
          <q-item-section>Products</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/cart/" @click="closeMenu">
          <q-item-section avatar>
            <q-icon :name="matShoppingCart" />
          </q-item-section>
          <q-item-section>Cart</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/checkout/" @click="closeMenu">
          <q-item-section avatar>
            <q-icon :name="matReceipt" />
          </q-item-section>
          <q-item-section>Checkout</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/my-account/" @click="closeMenu">
          <q-item-section avatar>
            <q-icon :name="matPerson" />
          </q-item-section>
          <q-item-section>My Account</q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-banner
        v-if="vapidConfigured && supported && permission !== 'granted' && permission !== 'denied'"
        class="bg-secondary text-white q-ma-md rounded-borders shadow-2"
        inline-actions
    >
      <div class="text-subtitle1">
        Enable push notifications?
      </div>

      <template #action>
        <q-btn
            style="line-height: 1;"
            outline
            padding="sm"
            color="secondary"
            text-color="white"
            label="Enable"
            @click="emit('subscribe')"
        />
      </template>
    </q-banner>
  </q-scroll-area>
</template>

<script setup>
import {
  matAdminPanelSettings,
  matShoppingCart,
  matHome,
  matStorefront,
  matReceipt,
  matPerson
} from '@quasar/extras/material-icons'

const vapidConfigured = !!import.meta.env.VITE_VAPID_APP_PUBLIC_KEY

defineProps({
  supported: {
    type: Boolean,
    required: true
  },
  permission: {
    type: String,
    required: true
  },
  isSuperAdmin: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits([
  'close',
  'subscribe'
])

function closeMenu() {
  emit('close')
}
</script>