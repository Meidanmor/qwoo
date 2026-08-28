<template>
<q-scroll-area :visible="false" class="fit">
          <h4 class="sticky">Cart</h4>
          <div v-if="itemsCount && Number(itemsCount) !== 0">
            <div v-for="item in cart.state.items" :key="item.id" class="q-pa-sm row items-center" :class="[item.key.includes('offline') ? 'offline-item' : '']">
              <div class="q-ml-sm flex">
                <img
                    width="70"
                    height="70"
                    v-if="item.images"
                    :src="cart.state.offline === true ? item?.images[0]?.src || '/naturaBloom-circle.svg' : item.images[0]?.thumbnail || '/naturaBloom-circle.svg'"
                    style="width: 70px; height: 70px; object-fit: cover"
                    :alt="`Cart item - ${item?.name}`"
                />
                <div class="product-meta text-text">
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
                  <q-btn size="xs" padding="xs" :flat="true" :icon="matAdd" @click="increase(item)" />
                </div>
                <q-btn :outline="true" size="xs" padding="xs" :icon="matClose" @click="remove(item.key, item.remote_key)" class="q-ml-sm" />
              </div>
            </div>

          </div>
          <div v-else class="q-pa-sm column items-start">
            <h2 class="text-h5 q-mb-sm">seems like your cart is empty</h2>
            <router-link to="/products/">
              <q-btn
                  color="secondary"
                  label="Shop now!"
              />
            </router-link>
          </div>

          <div class="cart-details sticky" v-if="Number(itemsCount) > 0">
            <div class="coupon-wrap">
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
                  <q-chip color="secondary" text-color="white" style="line-height:1">{{ coupon.code }}</q-chip>
                  <q-btn flat color="negative" label="Remove" @click="removeCoupon(coupon.code)" />
                </div>
              </div>
            </div>
            <div class="cart-totals">
              <div class="flex justify-between" v-if="couponApplied"><span>Total discount:</span> <span>{{formatCurrency(cartTotalDiscount)}}</span></div>
              <div class="flex justify-between"><span>Subtotal:</span> <div><span v-if="couponApplied"><del>{{formatCurrency((Number(cartTotalDiscount)+Number(cartItemsTotal)))}}</del> {{formatCurrency((Number(cartItemsTotal)-Number(cartTotalDiscount)))}}</span> <span v-else>{{ formatCurrency(cartItemsTotal) }}</span></div></div>
            </div>
            <div class="buttons-wrap">
              <router-link to="/checkout/">
                <q-btn
                    color="secondary"
                    label="Checkout"
                />
              </router-link>
              <router-link to="/cart/">
                <q-btn
                    :outline="true"
                    color="transparent"
                    label="View Cart"
                />
              </router-link>
            </div>
          </div>
        </q-scroll-area>
</template>
<script setup>
import {useQuasar} from "quasar"
import {formatCurrency} from 'src/utils/formatters.js'
import cart from 'src/stores/cart.js'
import {
  matAdd,
  matClose,
  matRemove } from '@quasar/extras/material-icons'
import {useCartSummary} from "src/composables/useCartSummary.js";
const $q = useQuasar();
// Wrap cart methods so template can call directly
const increase = (item) => {
  if(item?.quantity_limits){
    if(item.quantity === item.quantity_limits.maximum){
      cart.notifyUser($q, 'negative', 'There are only 9 in stock')
      return;
    }
  }
  cart.increase(item.id)
}
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

const {
  displayCart, couponApplied, couponCode, cartItemsTotal, cartTotalDiscount, couponError, itemsCount, applyCoupon, removeCoupon, loadingCoupon
} = useCartSummary()

</script>