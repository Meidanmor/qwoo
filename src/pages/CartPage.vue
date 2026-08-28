<template>
  <div class="container q-pa-md">
    <h2>Your Cart</h2>
    <div v-if="cartItems.length === 0" class="empty-cart-msg">
      Your cart is empty. <router-link to="/products/">Go to shop</router-link>
    </div>
        <div v-else-if="cart.hasItems.value && isHydrated" class="cart-items-wrap">
        <div v-for="item in cart.state.items" :key="item.id" class="q-pa-sm row items-center" :class="[item.key.includes('offline') ? 'offline-item' : '']">
          <div class="flex">
          <img v-if="item.images" :src="cart.state.offline === true ? item?.images[0]?.src : item.images[0]?.thumbnail" style="width: 70px; height: 70px; object-fit: cover" />
            <div class="product-meta">
            <div>
              <router-link
                :to="{ path: `/product/${getSlugFromPermalink(item?.permalink)}`, query: getVariationQuery(item) }"
                class="no-decoration">
              {{ item.name }}
              </router-link>
            </div>
           <div v-if="item.variation && item.variation.length > 0">
             <div
             v-for="(variation, index) in item.variation"
             :key="index"
             >
             {{variation.attribute}}: {{variation.value}}
             </div>
          </div>
            <div v-if="item.prices">
              {{formatCurrency(item.prices.price)}}
            </div>
            </div>
          </div>
            <div class="row items-center">
              <div class="qty-wrap">
              <q-btn size="xs" padding="xs" :flat="true" :icon="matRemove" @click="decrease(item.key)" :disable="item.quantity === 1" />
              <span class="q-mx-sm">{{ item.quantity }}</span>
              <q-btn size="xs" padding="xs" :flat="true" :icon="matAdd" @click="increase(item.id)" />
              </div>
              <q-btn :outline="true" size="xs" padding="xs" :icon="matClose" @click="remove(item.key, item.remote_key)" class="q-ml-sm" />
            </div>
        </div>

        </div>
    <q-card v-if="!cart.state.offline && cart.hasItems.value && isHydrated" flat bordered class="q-mt-md q-pa-md relative-position">
      <div class="blockUi" v-if="cart.state.loading.cart"></div>
      <div class="text-subtitle1">Coupon</div>
      <div class="row items-center q-col-gutter-sm q-mb-sm">
        <div class="col"><q-input v-model="couponCode" label="Coupon code" dense filled @keydown.enter.stop.prevent="applyCoupon(couponCode)"/></div>
        <div class="col-auto"><q-btn label="Apply" color="secondary" :loading="loadingCoupon" @click="applyCoupon(couponCode)" /></div>
      </div>
      <div v-if="couponError" class="text-negative">{{ couponError }}</div>
      <div v-if="couponApplied" class="text-positive q-mt-sm">
        Coupon applied successfully!
      </div>
      <div v-if="couponApplied">
        <div v-for="coupon in displayCart.coupons" :key="coupon.code" class="row items-center q-mb-sm">
        <q-chip color="secondary" text-color="white">{{ coupon.code }}</q-chip>
        <q-btn flat color="negative" label="Remove" @click="removeCoupon(coupon.code)" />
      </div>
      </div>
      <div class="text-subtitle1 q-mt-md">Shipping</div>
      <q-option-group
          v-if="shippingOptions.length"
          v-model="selectedShippingRateId"
          :options="shippingOptions"
          type="radio"
          color="secondary"
          @update:model-value="onShippingMethodChange"
      />
      <div v-else class="text-caption">Enter your address at checkout to see shipping options</div>
      <div class="q-mt-md">
      <div v-if="couponApplied">Total discount: {{formatCurrency(cartTotalDiscount)}}</div>
      <div class="text-h6">Total: {{ formatCurrency(cartTotal) }}</div>
      </div>
      <router-link to="/checkout/">
        <q-btn
            color="secondary"
            label="Checkout"
        />
      </router-link>

    </q-card>
    </div>
</template>

<script setup>
import cart from 'src/stores/cart';
import {onMounted, ref} from 'vue';
import {
  matAdd,
  matClose,
  matRemove} from '@quasar/extras/material-icons'
import {formatCurrency} from 'src/utils/formatters.js'
import { useCartSummary } from 'src/composables/useCartSummary'
import {useSeoMeta} from "src/composables/useSeo.js";

const {
  displayCart, cartTotal, cartItems, cartTotalDiscount, couponApplied, shippingOptions,
  selectedShippingRateId, couponCode, couponError,
  fetchShippingRates, onShippingMethodChange, applyCoupon, removeCoupon, loadingCoupon
} = useCartSummary()

defineOptions({
  async preFetch ({ ssrContext }) {
    let cartData;
    if(ssrContext) {
      cartData = await cart.fetchCart(true, ssrContext)
    } else if(cart.needsSync()) {
      cartData = await cart.syncLocalCartWithServer()
    }

    const seo = {
      title: 'Cart',
      description: 'Cart page',
      robots: 'noindex, follow'
    }

    if (ssrContext) {

      ssrContext.cartArray = cartData
      ssrContext.seoData = seo
    } else {
      window.__CART_ARRAY__ = cartData
      window.__SEO_DATA__ = seo

    }

  }
})
useSeoMeta()
const increase = (id) => cart.increase(id)
const decrease = (id) => cart.decrease(id)
const remove = (itemKey=null, itemAPIkey=null) => cart.remove(itemKey,itemAPIkey)

const getSlugFromPermalink = (permalink) => {
  if (!permalink) return ''
  const cleanUrl = permalink.split('?')[0]
  const match = cleanUrl.match(/product\/([^/]+)\/?$/)
  return match ? match[1] : ''
}

const getVariationQuery = (item) => {
  if (!item.variation?.length) return {}
  return Object.fromEntries(item.variation.map(v => [v.attribute, v.value]))
}

const isHydrated = ref(false)
onMounted(() => {
  isHydrated.value = true
  fetchShippingRates()
})
</script>

<style>
.empty-cart-msg {
  padding: 20px 0;
  font-size: 20px;
}
.empty-cart-msg a {
  text-decoration: underline;
  font-weight: 600;
}
.cart-items-wrap>.row{
    justify-content: space-between;
}
.cart-items-wrap>.row:not(:last-child) {
    border-bottom: 1px solid;
}
.cart-items-wrap {
    padding: 20px;
    border: 1px solid var(--q-secondary);
    border-radius: 20px;
}
.cart-items-wrap .flex {
  column-gap: 5px;
}
.blockUi{
  position: absolute;
  height: 100%;
  width: 100%;
  background: #00000050;
  z-index: 999;
  left: 0;
  top: 0;
}
.blockUi:before {
  content: '';
  width: 30px;
  height: 30px;
  border: 5px solid #000;
  background: transparent;
  border-radius: 50%;
  display: block;
  border-top-color: #00000025;
  position: sticky;
  top: 100px;
  margin: 100px auto 0;
  animation: rotate 1s linear infinite;
}
@keyframes rotate {
  from{
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
