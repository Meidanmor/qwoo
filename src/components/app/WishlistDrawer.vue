<template>
    <q-scroll-area class="fit q-pa-sm">

    <div>
      <div class="sticky wishlist-drawer-header flex justify-between q-mb-md">
        <div class="text-h6">Wishlist</div>
        <q-btn flat dense aria-label="Close wishlist drawer" padding="none" :icon="matClose" @click="emit('toggle-wishlist')"/>
      </div>
      <div v-if="wishlist.state.items && wishlist.state.items.length === 0" class="text-center text-grey">
      Your wishlist is empty.
      </div>
      <div v-else-if="wishlist.state.items && wishlist.state.items.length > 0" v-for="product in wishlist.state.items" :key="product.id" class="relative-position q-pa-sm row full-width">
        <router-link :to="`/product/${product.slug}/`" class="flex no-wrap q-pr-lg no-decoration text-secondary full-width">
          <img :src="product?.image || '/naturaBloom-circle.svg'" :alt="product.name" style="width: 70px; height: 70px; object-fit: cover" />
          <div class="q-ml-sm column items-start">
            <div>{{ product.name }}</div>
            <q-btn label="Add to Cart" color="secondary" @click="addToCart(product)" />
          </div>
        </router-link>
        <q-btn class="absolute absolute-top-right" :icon="matClose" flat @click.stop.prevent="removeFromWishlist(product.id)" />

      </div>

    </div>
    </q-scroll-area>

</template>

<script setup>
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'
import { matClose } from '@quasar/extras/material-icons'

const emit = defineEmits([
  'toggle-wishlist',
])

function addToCart(p){
cart.add(p.id, 1);
}

async function removeFromWishlist(id) {
  try {
    await wishlist.toggleWishlistItem(id)
  } catch (err) {
    console.error('Error removing from wishlist:', err)
  }
}
</script>
