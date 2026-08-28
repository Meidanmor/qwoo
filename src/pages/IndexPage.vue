<template>
  <div>
<section class="hero-section-sec">
  <img
      fetchpriority="high"
      loading="eager"
      decoding="sync"
      alt="Homepage hero image"
      :src="`${homeSettings?.hero_image}`"
      sizes="100vw"
      width="1367"
      height="768"
      class="hero-img"
  />
  <div class="hero-section container hero-margin row">

    <div class="hero-content col-12 col-md-6 q-mb-lg">
      <h1 class="stable-text" v-html="sanitizedHeroTitle"></h1>
      <p class="text-h6">{{homeSettings?.hero_description}}</p>

      <q-btn
             title="Go to products page"
              label="Browse Products"
              color="secondary"
              text-color="primary"
             class="btn-big"
              to="/products"
            />

    </div>
  </div>
</section>

    <section class="advantages">
      <div class="container">
        <div class="flex justify-between align-center">
          <div class="advantage-card">
            <svg xmlns="http://www.w3.org/2000/svg" width="33" height="24" viewBox="0 0 33 24" fill="none"><path d="M7.5 24C6.25 24 5.1875 23.5625 4.3125 22.6875C3.4375 21.8125 3 20.75 3 19.5H0V3C0 2.175 0.29375 1.46875 0.88125 0.88125C1.46875 0.29375 2.175 0 3 0H24V6H28.5L33 12V19.5H30C30 20.75 29.5625 21.8125 28.6875 22.6875C27.8125 23.5625 26.75 24 25.5 24C24.25 24 23.1875 23.5625 22.3125 22.6875C21.4375 21.8125 21 20.75 21 19.5H12C12 20.75 11.5625 21.8125 10.6875 22.6875C9.8125 23.5625 8.75 24 7.5 24ZM7.5 21C7.925 21 8.28125 20.8563 8.56875 20.5688C8.85625 20.2813 9 19.925 9 19.5C9 19.075 8.85625 18.7187 8.56875 18.4312C8.28125 18.1437 7.925 18 7.5 18C7.075 18 6.71875 18.1437 6.43125 18.4312C6.14375 18.7187 6 19.075 6 19.5C6 19.925 6.14375 20.2813 6.43125 20.5688C6.71875 20.8563 7.075 21 7.5 21ZM3 16.5H4.2C4.625 16.05 5.1125 15.6875 5.6625 15.4125C6.2125 15.1375 6.825 15 7.5 15C8.175 15 8.7875 15.1375 9.3375 15.4125C9.8875 15.6875 10.375 16.05 10.8 16.5H21V3H3V16.5ZM25.5 21C25.925 21 26.2813 20.8563 26.5688 20.5688C26.8563 20.2813 27 19.925 27 19.5C27 19.075 26.8563 18.7187 26.5688 18.4312C26.2813 18.1437 25.925 18 25.5 18C25.075 18 24.7187 18.1437 24.4312 18.4312C24.1437 18.7187 24 19.075 24 19.5C24 19.925 24.1437 20.2813 24.4312 20.5688C24.7187 20.8563 25.075 21 25.5 21ZM24 13.5H30.375L27 9H24V13.5Z" fill="#1976D2"/></svg>
            <span>GLOBAL EXPRESS</span>
            <p>Complimentary shipping on all orders over $150.
Carbon-neutral delivery.</p>
          </div>
          <div class="advantage-card">
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
<path d="M3.6 21.8885C2.475 20.7635 1.59375 19.4635 0.95625 17.9885C0.31875 16.5135 0 14.9885 0 13.4135C0 11.8385 0.3 10.2822 0.9 8.74471C1.5 7.20721 2.475 5.76346 3.825 4.41346C4.7 3.53846 5.78125 2.78846 7.06875 2.16346C8.35625 1.53846 9.88125 1.04471 11.6438 0.682212C13.4063 0.319712 15.4187 0.100962 17.6812 0.0259615C19.9437 -0.0490385 22.475 0.0384615 25.275 0.288462C25.475 2.93846 25.5375 5.37596 25.4625 7.60096C25.3875 9.82596 25.1813 11.8322 24.8438 13.6197C24.5062 15.4072 24.0313 16.9697 23.4188 18.3072C22.8063 19.6447 22.05 20.7635 21.15 21.6635C19.825 22.9885 18.4187 23.9572 16.9312 24.5697C15.4437 25.1822 13.925 25.4885 12.375 25.4885C10.75 25.4885 9.1625 25.1697 7.6125 24.5322C6.0625 23.8947 4.725 23.0135 3.6 21.8885V21.8885M7.8 21.2885C8.525 21.7135 9.26875 22.0197 10.0312 22.2072C10.7937 22.3947 11.575 22.4885 12.375 22.4885C13.525 22.4885 14.6625 22.2572 15.7875 21.7947C16.9125 21.3322 17.9875 20.5885 19.0125 19.5635C19.4625 19.1135 19.9188 18.4822 20.3813 17.6697C20.8438 16.8572 21.2437 15.7947 21.5812 14.4822C21.9187 13.1697 22.175 11.5822 22.35 9.71971C22.525 7.85721 22.55 5.63846 22.425 3.06346C21.2 3.01346 19.8188 2.99471 18.2812 3.00721C16.7437 3.01971 15.2125 3.13846 13.6875 3.36346C12.1625 3.58846 10.7125 3.95096 9.3375 4.45096C7.9625 4.95096 6.8375 5.63846 5.9625 6.51346C4.8375 7.63846 4.0625 8.75096 3.6375 9.85096C3.2125 10.951 3 12.0135 3 13.0385C3 14.5135 3.28125 15.8072 3.84375 16.9197C4.40625 18.0322 4.9 18.8135 5.325 19.2635C6.375 17.2635 7.7625 15.3447 9.4875 13.5072C11.2125 11.6697 13.225 10.1635 15.525 8.98846C13.725 10.5635 12.1563 12.3447 10.8188 14.3322C9.48125 16.3197 8.475 18.6385 7.8 21.2885V21.2885M7.8 21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885M7.8 21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885V21.2885" fill="#1976D2"/>
</svg>
            <span>GOTS CERTIFIED</span>
            <p>100% organic cotton and recycled materials.
Better for you and the planet.</p>
          </div>
          <div class="advantage-card">
<svg xmlns="http://www.w3.org/2000/svg" width="33" height="32" viewBox="0 0 33 32" fill="none">
<path d="M11.4 31.5L8.55 26.7L3.15 25.5L3.675 19.95L0 15.75L3.675 11.55L3.15 6L8.55 4.8L11.4 0L16.5 2.175L21.6 0L24.45 4.8L29.85 6L29.325 11.55L33 15.75L29.325 19.95L29.85 25.5L24.45 26.7L21.6 31.5L16.5 29.325L11.4 31.5V31.5M12.675 27.675L16.5 26.025L20.4 27.675L22.5 24.075L26.625 23.1L26.25 18.9L29.025 15.75L26.25 12.525L26.625 8.325L22.5 7.425L20.325 3.825L16.5 5.475L12.6 3.825L10.5 7.425L6.375 8.325L6.75 12.525L3.975 15.75L6.75 18.9L6.375 23.175L10.5 24.075L12.675 27.675V27.675M16.5 15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75V15.75M14.925 21.075L23.4 12.6L21.3 10.425L14.925 16.8L11.7 13.65L9.6 15.75L14.925 21.075V21.075" fill="#1976D2"/>
</svg>
            <span>LIFE GUARANTEE</span>
            <p>Engineered for durability. We offer repairs to
ensure your pieces last a lifetime.</p>
          </div>
        </div>
      </div>
    </section>
<!-- Featured Products Slider -->
<section ref="productSection" class="featured-products">
  <div class="container">
    <h2 class="q-mb-md">Featured Products</h2>

    <!-- Interactive carousel AFTER hydration -->
    <AppCarousel
  v-model="productsCarousel.slide.value"
  :carousel-key="productsCarousel.carouselKey.value"
  :show-controls="productsCarousel.showControls.value"
  :total="productsCarousel.total.value"
  :on-keydown="productsCarousel.onKeydown"
>
  <q-carousel-slide
    v-for="(group, index) in productsCarousel.slideChunks.value"
    :key="index" :name="index"
  >
    <div class="row q-col-gutter-md">
      <div v-for="item in group" :key="item.id" class="col-12 col-sm-6 col-md-4">
        <ProductCard :product="item" />
      </div>
    </div>
  </q-carousel-slide>
</AppCarousel>
  </div>
</section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-overlay">
          <div class="cta-img">
            <img loading="lazy" alt="Forest view" src="/cta-img.webp" width="500" height="750" />
          </div>
          <div class="cta-content">
            <span class="pre-title">Our Philosophy</span>
            <h2 class="text-text q-mb-md">Simple Pieces, Thoughtfully Made.</h2>
           <p class="text-text desc">Our journey began with a simple idea: clothing should be comfortable, durable, and made without compromise. Every piece is designed with quality materials that only get better with wear.</p>
            <q-btn
              ref="ctaBtn"
              label="Explore Our Products"
              color="transparent"
              :flat="true"
              text-color="black"
              class="btn-styled"
              to="/products"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
<section class="testimonials-section">
 <div class="container">
  <h2 class="q-mb-lg text-center">
    What Our Customers Say
  </h2>
    <AppCarousel
  v-model="testimonialsCarousel.slide.value"
  :carousel-key="testimonialsCarousel.carouselKey.value"
  :show-controls="testimonialsCarousel.showControls.value"
  :total="testimonialsCarousel.total.value"
  :on-keydown="testimonialsCarousel.onKeydown"
>
  <q-carousel-slide
    v-for="(group, slideIndex) in testimonialsCarousel.slideChunks.value"
    :key="slideIndex"
    :name="slideIndex"
  >
    <div class="row q-col-gutter-md">
      <div
        class="col-12 col-md-4"
        v-for="(testimonial, index) in group"
        :key="index"
      >
        <div class="q-card q-pa-md">
<article
  itemscope
  itemtype="https://schema.org/Review"
  class="text-center"
>
  <!-- Author -->
  <h3
    class="text-subtitle1 q-mb-sm"
    itemprop="author"
    itemscope
    itemtype="https://schema.org/Person"
  >
    <span itemprop="name">{{ testimonial.name }}</span>
  </h3>

  <!-- Rating -->
  <div
    itemprop="reviewRating"
    itemscope
    itemtype="https://schema.org/Rating"
    class="q-mb-sm"
  >
    <meta itemprop="ratingValue" :content="testimonial.rating" />
    <meta itemprop="bestRating" content="5" />

    <q-rating
      :model-value="testimonial.rating ?? 0"
      size="20px"
      color="amber"
      :icon="matStar"
      readonly
    />
  </div>

  <!-- Review text -->
  <p itemprop="reviewBody" class="text-body2 text-text">
    {{ testimonial.feedback }}
  </p>
</article>
        </div>
      </div>
    </div>
  </q-carousel-slide>
</AppCarousel>
  </div>
</section>


    <!-- Newsletter Signup Section -->
    <section class="newsletter-section">
      <div class="container text-center">
      <h2 class="q-mb-md">Join the List</h2>
      <p class="text-body1 q-mb-lg">Get first access to new arrivals and 15% off your first order.</p>
      <q-input filled v-model="email" label="Your email address" class="subscribe-email-input q-mb-md" />
      <q-btn class="q-plr-lg" size="lg" label="Subscribe" color="secondary" text-color="primary" @click="subscribeNewsletter" />
   </div>
    </section>

  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, useSSRContext } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import productsStore from 'src/stores/products'
import { matStar, matWarning, matCheckCircle } from '@quasar/extras/material-icons'
import { loadPageConfig } from 'src/utils/config-loader'
import ProductCard from '../components/shop/ProductCard.vue'
import AppCarousel from '../components/app/AppCarousel.vue'
import {useCarousel} from '/src/composables/useCrousel.js'
import {useSeoMeta} from "src/composables/useSeo.js";
import {getApiOrigin} from "src/utils/server/get-api-origin.js";
import {resolveHeroImageSrc} from 'src/utils/resolve-hero-image.js';
import { sanitizeHeroTitle } from 'src/utils/sanitizeHtml.js'

const isHydrated = ref(false)
const $q = useQuasar()

// Static, pre-hydration featured-products list. This is the single source of
// truth for the SSR/no-JS markup and MUST match what preFetch resolved,
// otherwise the client render mismatches the server-rendered HTML.
// We do NOT fall back to deriving this from productsStore + featured_products
// ids anymore — that's what caused the mismatch when config.featured_products
// referenced stale/removed product ids. We trust preFetch's resolution
// (with its own internal fallback) as the only source for this list.
const staticFeaturedProducts = ref([])

if (process.env.CLIENT && window.__HOME_PRODUCTS_DATA__) {
  staticFeaturedProducts.value = window.__HOME_PRODUCTS_DATA__
}

const route = useRoute();
// ----------------- Scroll -----------------
const scrollToProducts = () => {}
defineExpose({ scrollToProducts })

// ----------------- SEO -----------------

// Inside your Page or Layout
defineOptions({
  async preFetch({ssrContext, currentRoute}) {

    // Resolves the featured-products list for the homepage.
    // Tries the configured featured_products ids first; falls back to the
    // latest products if there are no ids configured, or if resolving the
    // configured ids came back empty (e.g. stale ids no longer in the catalog).
    async function resolveFeaturedProducts(featuredIds) {
      let products = featuredIds?.length
          ? await productsStore.getFeaturedProducts(featuredIds, ssrContext)
          : await productsStore.preFetchProducts({api: true, per_page: 6, dryRun: true, ssrContext}).then(r => r.products)

      if (!products?.length) {
        products = await productsStore.preFetchProducts({api: true, per_page: 6, dryRun: true, ssrContext}).then(r => r.products)
      }

      return products
    }

    const {fetchSeoForPath} = await import('src/composables/useSeo')

    const isPreview = currentRoute.query.preview === 'true'

    const [seo, configData] = await Promise.all([
      fetchSeoForPath('homepage', getApiOrigin(ssrContext)),
      loadPageConfig('home', isPreview, getApiOrigin(ssrContext)), // The helper we'll create
    ])

    if (configData) {
      configData.hero_image = await resolveHeroImageSrc(configData.hero_image, "homepage-hero", getApiOrigin(ssrContext))
    }

    const featuredIds = configData?.featured_products || []
    const leanProducts = await resolveFeaturedProducts(featuredIds)

    if (ssrContext) {
      // Initialize the state object if it doesn't exist
      ssrContext.seoData = seo
      // INJECT PRODUCTS HERE:
      ssrContext.homeProductsData = leanProducts
      ssrContext.pageConfig = configData
      // 2. Attach it to the rendered state (for the component)
      ssrContext.heroData = {
        src: `${configData?.hero_image}`,
      }

    } else {
      window.__PAGE_CONFIG__ = configData;
      window.__SEO_DATA__ = seo;
      window.__HOME_PRODUCTS_DATA__ = leanProducts

    }
  }
})

const homeSettings = ref(
  process.env.CLIENT && window.__PAGE_CONFIG__
    ? window.__PAGE_CONFIG__
    : null
)

useSeoMeta()

// 1. THE SERVER FIX (Force the HTML to populate)
if (process.env.SERVER) {
  const ssr = useSSRContext()
  homeSettings.value = ssr?.pageConfig || null
  staticFeaturedProducts.value = ssr?.homeProductsData || [];

}

const sanitizedHeroTitle = computed(() => sanitizeHeroTitle(homeSettings.value?.hero_title))
// ----------------- Setup -----------------

const productSection = ref(null)
const ctaBtn = ref(null)
const email = ref('')

// Helper: chunk array
const productsCarousel = useCarousel(async () => {
  if (typeof window !== 'undefined' && Array.isArray(window.__HOME_PRODUCTS_DATA__)) {
    return window.__HOME_PRODUCTS_DATA__;
  }
  const ids = homeSettings.value?.featured_products || []
  if (ids.length) {
    const missing = ids.filter(id => !productsStore.products.value.find(p => Number(p.id) === Number(id)))
    if (missing.length) await productsStore.getFeaturedProducts(missing)
    return ids.map(id => productsStore.products.value.find(p => Number(p.id) === Number(id))).filter(Boolean)
  }
  if (!productsStore.products.value.length) {
    await productsStore.preFetchProducts({ api: true, per_page: 6, dryRun: false })
  }
  return productsStore.products.value.slice(0, 6)
}, { isHydrated })

// ----------------- Testimonials & Instagram -----------------
//const avatarSVG =
  '<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"> <circle cx="40" cy="40" r="40" fill="#E8F5E9"/> <circle cx="40" cy="30" r="12" fill="#81C784"/> <path d="M20 60c0-10 9-18 20-18s20 8 20 18H20z" fill="#81C784"/> </svg>'

const testimonials = ref([
  { name: 'Alice Johnson', feedback: 'The merino sweater is the softest thing I own — perfect for layering.' },
  { name: 'Mark Thompson', feedback: 'Love the quality of the tote bag, sturdy enough for daily use.' },
  { name: 'Sophie Lee', feedback: 'Fast shipping and the sizing guide was spot on.' },
  { name: 'John Doe', feedback: 'Amazing quality!' },
  { name: 'Jane Smith', feedback: 'Will buy again.' }
])
const testimonialsCarousel = useCarousel(
  async () => testimonials.value,
  { isHydrated }
)


// ----------------- Helpers -----------------
const subscribeNewsletter = () => {
  if (email.value) {
    $q.notify({ type: 'positive', message: 'Subscribed successfully!', icon: matWarning })
    email.value = ''
  } else {
    $q.notify({ type: 'negative', message: 'Please enter a valid email.', icon: matCheckCircle })
  }
}

// ----------------- Mounted -----------------
onMounted(async() => {
  if (window.__PAGE_CONFIG__ && Object.keys(window.__PAGE_CONFIG__).length) {
    homeSettings.value = window.__PAGE_CONFIG__
  } else {
    const isPreview = route.query.preview === 'true'
    // Use it directly
    const freshConfig = await loadPageConfig('home', isPreview)
    if (freshConfig) {
      if(freshConfig?.hero_image){
        freshConfig.hero_image = await resolveHeroImageSrc(freshConfig.hero_image, 'homepage-hero');
      }
      homeSettings.value = freshConfig
    }
  }

  isHydrated.value = false
  if (process.env.CLIENT) {
    // COLD START: Wait for user interaction

    const hydrateOnInteraction = () => {
      if (isHydrated.value) return
      requestIdleCallback(() => {
        window.removeEventListener('scroll', hydrateOnInteraction)
        window.removeEventListener('mousemove', hydrateOnInteraction)
        window.removeEventListener('touchstart', hydrateOnInteraction)

        requestAnimationFrame(async () => {
          isHydrated.value = true
        })

        testimonialsCarousel.recompute(false)
      })

    }

    window.addEventListener('scroll', hydrateOnInteraction, {passive: true})
    window.addEventListener('mousemove', hydrateOnInteraction, {passive: true})
    window.addEventListener('touchstart', hydrateOnInteraction, {passive: true})

    // Safety fallback: Hydrate after 5 seconds if no interaction
    setTimeout(hydrateOnInteraction, 5000)

  }
})

watch(isHydrated, async (val) => {
  if (!val) return
  try {
    await productsCarousel.recompute(true)
    await testimonialsCarousel.recompute(true)
  } catch (err) {
    console.error('Hydration error:', err)
  }
}, )


const stopProductsWatch = watch(
  [() => productsStore.products.value, () => $q.screen.name, () => homeSettings.value],
  () => {
    if (!isHydrated.value) return
    productsCarousel.recompute(false)
    testimonialsCarousel.recompute(false)
  }
)
onBeforeRouteLeave(() => {
  stopProductsWatch()
})
</script>
<style>
@import 'src/css/home-page.css';
</style>