<template>
  <section class="related-products">
    <div class="container">
      <h2 class="text-h5 q-mb-md text-center">Related Products</h2>

      <!-- GRID MODE (for few products) -->
      <div v-if="products.length <= perSlide" class="related-product-wrapper row justify-center">
        <div
            v-for="product in products"
            :key="product.id"
            class="col-xs-6 col-md-3 q-mb-md relative-position"
        >
          <ProductCard :product="product" />
        </div>
      </div>

      <!-- SLIDER MODE -->
      <AppCarousel
          v-else
          v-model="carousel.slide.value"
          :carousel-key="carousel.carouselKey.value"
          :show-controls="carousel.showControls.value"
          :total="carousel.total.value"
          :on-keydown="carousel.onKeydown"
      >
        <q-carousel-slide
            v-for="(group, index) in carousel.slideChunks.value"
            :key="index"
            :name="index"
        >
          <div class="related-product-wrapper row justify-center">
            <div
                v-for="product in group"
                :key="product.id"
                :class="[colClass, 'q-mb-md', 'relative-position']"
            >
              <ProductCard :product="product" />
            </div>
          </div>
        </q-carousel-slide>
      </AppCarousel>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import ProductCard from 'src/components/shop/ProductCard.vue'
import AppCarousel from 'src/components/app/AppCarousel.vue'
import { useCarousel } from 'src/composables/useCrousel.js'
import { preFetchProducts } from 'src/stores/products.js'

const props = defineProps({
  productId: Number,
  categoryId: Number
})

const $q = useQuasar()
const products = ref([])
const perSlide = ref(4) // used only for grid-vs-slider decision + colClass

const getSlugFromPermalink = (permalink) => {
  const match = permalink.match(/product\/([^/]+)\/?$/)
  return match ? match[1] : ''
}

const updatePerSlide = () => {
  if ($q.screen.lt.sm) perSlide.value = 2
  else if ($q.screen.lt.md) perSlide.value = 3
  else perSlide.value = 4
}
updatePerSlide()
watch(() => $q.screen.name, () => {
  updatePerSlide()
  carousel.recompute(false)
})

const colClass = computed(() => {
  if ($q.screen.lt.sm) return 'col-6'
  if ($q.screen.lt.md) return 'col-4'
  return 'col-3'
})

// useCarousel drives chunking based on its own internal breakpoints (1/2/3 per slide)
const carousel = useCarousel(async () => products.value, {
  chunkSizes: { xs: 2, sm: 3, md: 4 }
})

const fetchRelatedProducts = async () => {
  let result = await preFetchProducts({
    category: props.categoryId,
    per_page: 9,
  })

  let related = (Array.isArray(result) ? result : result?.products ?? [])
      .filter((p) => p.id !== props.productId)
      .map((p) => ({
        ...p,
        slug: getSlugFromPermalink(p.permalink),
      }))

  if (related.length === 0) {
    result = await preFetchProducts({ per_page: 9 })

    related = (Array.isArray(result) ? result : result?.products ?? [])
        .filter((p) => p.id !== props.productId && p.is_in_stock)
        .slice(0, 8)
        .map((p) => ({
          ...p,
          slug: getSlugFromPermalink(p.permalink),
        }))
  }

  products.value = related
  await carousel.recompute(true)
}

onMounted(fetchRelatedProducts)

watch([() => props.productId, () => props.categoryId], fetchRelatedProducts)
</script>

<style>
section.related-products {
    padding-left: 0;
    padding-right: 0;
}
.related-products .related-product-wrapper > div {
    padding: 20px 5px;
}
.related-products .related-product-wrapper > div,
.related-products .related-product-wrapper > div .q-card{
    transition: 0.3s ease;
}

.related-products .related-product-wrapper > div:hover {
  transform: translateY(-10px);
  z-index: 1;
}

.related-products .related-product-wrapper > div:hover .q-card {
  opacity: 0.8;
  box-shadow: 0px 10px 25px #00000020;
}

.related-products img.q-img__image {
  height: 100%;
}
.related-products .q-img.q-img--menu.q-mb-sm {
    height: 200px;
}
@media(max-width: 767px){
  .related-products .q-carousel img {
    max-height: 250px;
  }
}
</style>
