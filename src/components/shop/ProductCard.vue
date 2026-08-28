<template>
  <router-link class="relative-position" :to="`/product/${getSlugFromPermalink(product.permalink)}`">
          <div class="item-loop-wl absolute">
              <q-btn aria-label="Remove from wishlist" class="text-black q-pa-none text-caption q-mt-sm" flat :loading="wishlist.isLoading(product.id)" v-if="wishlist.state.items && Object.values(wishlist.state.items).find(obj => product.id === obj.id)" @click.prevent="addToWishlist(product.id)" color="accent" :icon="matFavorite" />
              <q-btn aria-label="Add to wishlist" class="text-black q-pa-none text-caption q-mt-sm" flat :loading="wishlist.isLoading(product.id)" v-else @click.prevent="addToWishlist(product.id)" color="accent" :icon="matFavoriteBorder" />
          </div>
      <div
    v-if="!product.is_in_stock"
    class="absolute q-ma-sm"
    style="z-index: 3; top: 11px; left: 10px;"
  >
    <q-badge
      color="grey-8"
      label="Sold out"
      class="text-caption text-black text-weight-medium q-px-sm q-py-xs"
    />
  </div>
          <div
    v-if="product.is_in_stock && product.on_sale"
    class="absolute q-ma-sm"
    style="z-index: 3; top: 11px; left: 10px;"
  >
    <q-badge
      color="grey-8"
      label="Sale!"
      class="text-caption text-black text-weight-medium q-px-sm q-py-xs"
    />
  </div>



          <q-card class="my-card full-height">
            <img
            :img-src="product.images[0]?.src"
            :src="product.images[0]?.src ? product.images[0].src : '/naturaBloom-circle.svg'"
            :srcset="product.images[0]?.srcset"
            :sizes="product.images[0]?.sizes"
            :alt="product.name"
            :loading="priority ? 'eager' : 'lazy'"
            :fetchpriority="priority ? 'high' : 'auto'"
            height="350px"
            width="auto"
            class="rounded-borders product-img"
            />
            <div class="flex q-pa-md">
              <div class="full-width q-mb-sm">
              <div class="text-text">{{ product.name }}</div>
              <div class="text-subtitle2 text-text" v-html="sanitizedPrice" />
              </div>
              <div v-if="product.status && product.status === 'draft'"><b>This is a draft product. It's shown for admins only!</b></div>
              <q-btn class="btn-big loop-add-to-cart-btn" aria-label="Add to cart" style="line-height: 1" v-else-if="product.is_in_stock && product.type !== 'variable'" label="Add to Cart" color="secondary" @click.prevent="addToCart(product)" />
              <q-btn class="btn-big loop-add-to-cart-btn" aria-label="Choose options" style="line-height: 1" v-else-if="product.is_in_stock && product.type === 'variable'" label="Choose options" color="secondary" />
              <div v-else>Out of stock</div>
              </div>
          </q-card>
  </router-link>
</template>

<script setup>
import { matFavorite, matFavoriteBorder } from '@quasar/extras/material-icons'
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'
import { useSanitizedPrice } from 'src/composables/useSanitizedHtml.js'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  priority: Boolean
})

const sanitizedPrice = useSanitizedPrice(() => props.product.price_html)

/*const isWishlisted = computed(() => {
  const items = cart.state.wishlist_items || {}

  return Object.values(items).some(
    item => item.id === props.product.id
  )
})*/

const getSlugFromPermalink = (permalink) => {
  return permalink.split('/').filter(Boolean).pop()
}
const addToCart = (product) => {
  cart.add(product.id, 1)
}

async function addToWishlist(objID = 0) {
  await wishlist.toggleWishlistItem(objID, $q);
}

</script>