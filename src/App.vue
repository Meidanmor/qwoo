<template>
  <div>
    <q-banner
      v-if="cart.state.offline"
      class="bg-orange text-white q-pa-sm"
      dense
    >
      <template #avatar>
        <q-icon :name="matWifiOff" />
      </template>

      You are currently offline. Some features may be limited.
    </q-banner>

    <router-view />
  </div>
</template>

<script setup>
import {matWifiOff} from '@quasar/extras/material-icons'
import cart from "src/stores/cart.js";
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(async () => {
  if (!cart.state.offline) return

  const navEntries = performance.getEntriesByType('navigation')

  const isReload =
    navEntries.length &&
    navEntries[0].type === 'reload'

  if (!isReload) return

  const originalPath =
    window.location.pathname

  // avoid loop
  if (router.currentRoute.value.path !== originalPath) {
    await router.replace(originalPath)
  }
})
</script>