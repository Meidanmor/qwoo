<!-- src/components/shop/ProductResultsGrid.vue -->
<template>
  <div v-if="loading" class="products-inner row q-col-gutter-md">
    <div v-for="n in 6" :key="'skeleton-' + n" class="col-xs-12 col-sm-6 col-md-4">
      <q-card class="my-card full-height">
        <q-skeleton height="250px" square />
        <q-card-section>
          <q-skeleton type="text" width="70%" />
          <q-skeleton type="text" width="40%" />
        </q-card-section>
        <q-card-actions class="q-gutter-sm">
          <q-skeleton type="rect" width="100px" height="36px" />
          <q-skeleton type="rect" width="70px" height="36px" />
        </q-card-actions>
      </q-card>
    </div>
  </div>

  <div v-else-if="products.length" class="products-inner row q-col-gutter-md">
    <div v-for="(product, index) in products" :key="product.id" class="col-xs-12 col-sm-6 col-md-4 relative-position">
      <ProductCard :product="product" :priority="index < 3" />
    </div>
  </div>

  <div v-else class="text-center q-mt-lg">No products found</div>
</template>

<script setup>
import ProductCard from './ProductCard.vue'
defineProps({ loading: Boolean, products: { type: Array, default: () => [] } })
</script>