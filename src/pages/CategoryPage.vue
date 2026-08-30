<template>
  <div class="main-wrapper-div">
    <div class="container">
      <q-breadcrumbs>
        <q-breadcrumbs-el label="Home" to="/" />
        <q-breadcrumbs-el label="Products" to="/products" />
        <q-breadcrumbs-el><span v-html="safeCategoryName"></span></q-breadcrumbs-el>
      </q-breadcrumbs>

      <h1 v-html="safeCategoryName || 'Products'"></h1>

      <div class="archive-layout flex no-wrap">
        <div class="filters-wrap flex" :class="{ 'shown': filtersOpen }" @pointerdown.stop >
          <q-scroll-area :visible="false" class="fit">

            <div class="sticky filters-drawer-header flex justify-between q-mb-md">
              <div class="text-h6">Filters</div>
              <q-btn
                  class="mobile-only"
                  :icon="matClose"
                  flat
                  dense
                  @click="filtersOpen = false"
                  aria-label="Close filters drawer"
              />
            </div>

          <div class="col-xs-12 col-md-6 q-mb-md">
            <q-input filled v-model="search" label="Search products..." debounce="300" />
          </div>

          <PriceFilterCard v-model="priceRange" :min="priceMin" :max="priceMax" @change="onPriceChange" />
          </q-scroll-area>
        </div>

        <div class="products-wrap">
          <div class="flex justify-between q-mb-md total-products">
            <div v-if="totalProducts" class="text-subtitle1 q-mb-sm">
              Found {{ totalProducts || 0 }} product{{ totalProducts === 1 ? '' : 's' }}
            </div>
          </div>

          <SortBar
              v-model:sortBy="sortBy"
              :sortOptions="sortOptions"
              @toggle-filters="filtersOpen = !filtersOpen"
          />

          <ProductResultsGrid :loading="productsStore.productsLoading.value" :products="paginatedProducts" />

          <ArchivePagination
              v-model="currentPage"
              :totalPages="totalPages"
              @page-change="scrollToTop"
          />

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { createArchivePreFetch, useProductArchive } from 'src/composables/useProductArchive'
import { matClose } from '@quasar/extras/material-icons'
import PriceFilterCard from '../components/shop/PriceFilterCard.vue'
import ProductResultsGrid from '../components/shop/ProductResultsGrid.vue';
import ArchivePagination from '../components/shop/ArchivePagination.vue';
import SortBar from '../components/shop/SortBar.vue';
import { useSanitizedText } from 'src/composables/useSanitizedHtml'

defineOptions({ preFetch: createArchivePreFetch('category') })

const {
  search, selectedCategoryOBJ, currentPage, sortBy, filtersOpen,
  priceMin, priceMax, priceRange,
  paginatedProducts, totalPages, totalProducts,
  sortOptions, onPriceChange, scrollToTop, productsStore,
} = useProductArchive('category')

const safeCategoryName = useSanitizedText(() => selectedCategoryOBJ.value?.name)

</script>
<style scoped>
@import 'src/css/product-archive.css';
</style>