<template>
  <div class="container" v-if="product">
    <div class="q-pa-md">
    <q-breadcrumbs>
          <q-breadcrumbs-el label="Home" to="/" />
          <q-breadcrumbs-el :to="`/product-category/${product?.categories[0]?.slug}`"><span v-html="safeCategoryName"></span></q-breadcrumbs-el>
          <q-breadcrumbs-el :label="product?.name" />
    </q-breadcrumbs>
    </div>
    <div class="q-pa-md row q-col-gutter-lg">
      <!-- Product Images -->
      <div class="col-12 col-md-6">
        <div v-if="product?.images?.length > 1">
            <AppCarousel
                v-model="imagesCarousel.slide.value"
                :carousel-key="imagesCarousel.carouselKey.value"
                :show-controls="imagesCarousel.showControls.value"
                :total="imagesCarousel.total.value"
                :on-keydown="imagesCarousel.onKeydown"
                v-if="product?.images?.length > 1"
            >
            <q-carousel-slide
              v-for="(img, index) in product?.images"
              :key="index"
              :name="index"
              @mousedown="onImageMouseDown"
              @mousemove="onImageMouseMove"
              @click="onImageClick(index)"
              style="cursor: zoom-in;max-height: 400px;object-fit: contain;"
              >
              <img
              :src="img.src"
              :srcset="img.srcset"
              :sizes="img.sizes"
              :alt="`${product.name} image ${index}`"
              :loading="index === 0 ? 'eager' : 'lazy'"
              :fetchpriority="index === 0 ? 'high' : 'auto'"
              :decoding="index === 0 ? 'sync' : 'async'"
              height="400"
              width="400"
              style="cursor: zoom-in;max-height: 400px;object-fit: contain;margin:0 auto;"
            />
            </q-carousel-slide>
            </AppCarousel>

        </div>

        <div v-else>
          <img
            :src="product.images[0]?.src ? product.images[0].src : '/naturaBloom-circle.svg'"
            :srcset="product.images[0]?.srcset"
            :sizes="product.images[0]?.sizes"
            fetchpriority="high"
            loading="eager"
            :alt="`${product.name} featured image`"
            style="cursor: zoom-in; max-height: 500px"
            height="400"
            width="400"
  @mousedown="onImageMouseDown"
  @mousemove="onImageMouseMove"
  @click="onImageClick(0)"
          />
        </div>
      </div>

      <!-- Product Details -->
      <div class="col-12 col-md-6">

        <h1 class="q-mb-sm">{{ product.name }}</h1>

        <!-- Categories -->
        <div class="q-mb-md">
          <router-link
              v-for="cat in product.categories"
              :key="cat.id"
              :to="`/product-category/${cat.slug}`"
          class="no-decoration"
          >
          <q-chip
            color="secondary"
            text-color="white"
            class="category-chip"
            dense
            clickable
          >
              <span>{{cat.name}}</span>
          </q-chip>
          </router-link>
        </div>

        <!-- Price -->
        <div class="q-mb-md">

          <q-skeleton
              v-if="variationLoading"
              type="text"
              width="120px"
          />

          <div v-else-if="selectedVariation">
            <div v-html="safeVariationPrice"></div>
          </div>

          <div v-else-if="product" v-html="safePrice"></div>

        </div>

        <div class="q-mb-md" v-html="safeDescription"></div>

        <!-- Variations Selection for Variable Product -->
        <div v-if="isVariable" class="q-mb-md">
          <div
            v-for="(attribute) in availableAttributes"
            :key="attribute.id"
            class="q-mb-sm"
          >
            <label class="text-subtitle2 q-mb-xs">{{ attribute.name }}</label>
<q-select
  v-model="selectedVariations[attribute.name]"
  :options="getOptionsWithDisabled(attribute)"
  dense
  :dropdown-icon="matArrowDropDown"
  :clear-icon="matCancel"
  clearable
  :placeholder="`Select a ${attribute.name}`"
  :label="`Select a ${attribute.name}`"
  emit-value
  map-options
  @update:model-value="onVariationChange"
/>
          </div>
          <div v-if="variationError" class="text-negative text-caption q-mt-xs">
            {{ variationError }}
          </div>
        </div>

        <div v-if="product.status && product.status === 'draft'"><b>This is a draft product. It's shown for admins only!</b></div>

        <div v-else-if="product.is_in_stock">
          <div style="color:red" v-if="Number(product.add_to_cart?.maximum) != 0 && Number(product.add_to_cart?.maximum) < 10">
            <span v-if="Number(product.add_to_cart?.maximum) === 1">The is only 1 left in stock!</span>
            <span v-else>The are only {{product.add_to_cart?.maximum}} left in stock!</span>
          </div>
        <!-- Quantity Selector -->
        <div class="row items-center q-mb-md">
          <q-btn aria-label="Decrease quantity" flat round :icon="matRemove" @click="decreaseQty" />
          <q-input
            v-model.number="quantity"
            type="number"
            :min="product?.add_to_cart?.minimum"
            :max="product?.add_to_cart?.maximum"
            dense
            style="width: 60px; text-align: center"
            :aria-label="`Quantity for ${product.name}`"
          />
          <q-btn aria-label="Increase quantity" flat round :icon="matAdd" @click="increaseQty(product.add_to_cart?.maximum)" />
        </div>

        <q-btn
          label="Add to Cart"
          class="q-mr-sm"
          color="secondary"
          :disable="shouldDisableCartButtons"
          @click="addToCartHandler"
          :loading="cart.state.loading.cart"
        >
          <q-tooltip v-if="shouldDisableCartButtons">
            Please select a variation first.
          </q-tooltip>
        </q-btn>

        <q-btn
          label="Quick Checkout"
          color="black"
          to="/checkout"
          class="quick-checkout-btn"
          :disable="shouldDisableCartButtons"
          @click="addToCartHandler"
          :loading="cart.state.loading.quickbuy"
        >
          <q-tooltip v-if="shouldDisableCartButtons">
            Please select a variation first.
          </q-tooltip>
        </q-btn>

        </div>

        <div v-else> Out of stock </div>

       <div class="full-width">
        <q-btn class="text-black q-pa-none text-caption q-mt-sm" flat :loading="wishlist.isLoading(product.id)" v-if="wishlist.state.items && Object.values(wishlist.state.items).find(obj => selectedVariation ? selectedVariation.id : product.id === obj.id)" @click="addToWishlist" color="accent" label="Remove from wishlist" :icon="matFavorite" />
        <q-btn class="text-black q-pa-none text-caption q-mt-sm" flat :loading="wishlist.isLoading(product.id)" v-else @click="addToWishlist" color="accent" label="Add to wishlist" :icon="matFavoriteBorder" />
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <RelatedProductsSlider
      :productId="product.id"
      :categoryId="product.categories[0]?.id"
      :maxVisible="4"
    />
  </div>

  <div v-else-if="product === null" class="q-pa-md flex items-center justify-center">
    <q-spinner color="secondary" size="6em" />
  </div>
  <LightboxGallery ref="lightboxRef" />
</template>

<script setup>
import { ref, onMounted, computed, useSSRContext, watch } from 'vue'
import { useRoute, onBeforeRouteUpdate } from 'vue-router'
import { fetchProductById } from 'src/api/woocommerce.js'
import cart from 'src/stores/cart.js'
import wishlist from 'src/stores/wishlist.js'
import RelatedProductsSlider from '../components/shop/RelatedProductsSlider.vue'
import { useQuasar } from 'quasar'
import { fetchSeoForPath } from 'src/composables/useSeo'
import productsStore from 'src/stores/products'
import {
  matFavoriteBorder,
  matFavorite,
  matAdd,
  matRemove,
  matArrowDropDown,
  matCancel, matError
} from '@quasar/extras/material-icons'
import { useSanitizedDescription, useSanitizedPrice, useSanitizedText } from 'src/composables/useSanitizedHtml'
import LightboxGallery from 'src/components/LightboxGallery.vue'
import AppCarousel from '../components/app/AppCarousel.vue'
import {useCarousel} from '/src/composables/useCrousel.js'
import {useSeoMeta} from "src/composables/useSeo.js";
import {getApiOrigin} from "src/utils/server/get-api-origin.js";


const $q = useQuasar()
const route = useRoute()
const product = ref(null)
const quantity = ref(1)
const getSlugFromPermalink = (permalink) => {
  const match = permalink.match(/product\/([^/]+)\/?$/)
  return match ? match[1] : ''
}

if (process.env.SERVER) {
  const ssrContext = useSSRContext()

  if (ssrContext?.productData) {
    product.value = ssrContext.productData
  }
}
if (process.env.CLIENT) {
  if (window.__PRODUCT_DATA__ && window.__PRODUCT_DATA__.id) {
    const ssrProductSlug = getSlugFromPermalink(window.__PRODUCT_DATA__.permalink)
    if(ssrProductSlug === route.params.slug) {
      product.value = window.__PRODUCT_DATA__
    }
  }
}

const isHydrated = ref(process.env.CLIENT)

const imagesCarousel = useCarousel(
  async () => product.value?.images,
    {
      isHydrated,
      chunkSizes: { xs: 1, sm: 1, md: 1 }
    }
)

// 🟢 Run on SSR only
// Inside your Page or Layout
defineOptions({
  async preFetch ({ ssrContext, currentRoute }) {
    const seo = await fetchSeoForPath(currentRoute.path, getApiOrigin(ssrContext))
    const productData = await productsStore.fetchSingleProduct(currentRoute.params.slug, ssrContext)

    if (ssrContext) {

      // ✅ Normalize categories on SSR
      if (productData && !productData?.categories?.length) {
        productData.categories = [
          productData?.extensions?.qwoo?.default_category
        ].filter(Boolean)
      }
      // Initialize the state object if it doesn't exist
      ssrContext.seoData = seo
      ssrContext.productData = productData
    } else {
      window.__PRODUCT_DATA__ = seo
      window.__SEO_DATA__ = seo
    }
  }
})

useSeoMeta()

function getOptionsWithDisabled(attribute) {
  // Get all original options for this attribute
  const allOptions = product.value.attributes
    .find(a => a.name === attribute.name)?.terms.map(t => t.name) || []

  return allOptions.map(opt => ({
    label: opt,
    value: opt,
    disable: !attribute.options.includes(opt)
  }))
}

const availableAttributes = computed(() => {
  if (!product.value?.attributes) return []

  const attrMap = {}
  for (const attr of product.value.attributes) {
    if (!attrMap[attr.name]) {
      attrMap[attr.name] = {
        name: attr.name,
        id: attr.id,
        allOptions: attr.terms.map(t => t.name)
      }
    }
  }

  const attributeNames = Object.keys(attrMap)

  return attributeNames.map(attrName => {
    const allOptions = attrMap[attrName].allOptions

    const validOptions = allOptions.filter(optionValue => {
      // Build a hypothetical selection with this option chosen
      const hypothetical = { ...selectedVariations.value, [attrName]: optionValue }

      // Check if any variation is compatible with this hypothetical selection
      return product.value.variations.some(variation => {
        return attributeNames.every(name => {
          const selectedVal = hypothetical[name]

          // If this attribute isn't selected yet in hypothetical, skip it
          if (!selectedVal) return true

          const varAttr = variation.attributes.find(a => a.name === name)
          if (!varAttr) return false

          // Wildcard matches anything
          if (varAttr.value === null) return true

          return varAttr.value.toLowerCase() === selectedVal.toLowerCase()
        })
      })
    })

    return {
      name: attrName,
      id: attrMap[attrName].id,
      options: validOptions
    }
  })
})


const lightboxRef = ref(null)

// replace your openLightbox function with:
function openLightbox(index) {
  lightboxRef.value.open(product.value?.images.length ? product.value?.images :  [{ src: '/naturaBloom-circle.svg' }], index)
}

const openDrawer = ref(true);
function addToCart(e) {
  handleAddToCart(e)
}
function handleAddToCart(e) {
  if (e && e.target.innerText == 'QUICK CHECKOUT') {
    openDrawer.value = false;
  }
  const matchedVariation = product.value.variations.find((variation) => {
    return Object.entries(selectedVariations.value).every(([attrName, selectedValue]) => {
      const attr = variation.attributes.find(a => a.name === attrName);
      if (!attr || selectedValue === null) return false;
      if (attr.value === null) return true;
      return attr.value.toLowerCase() === selectedValue.toLowerCase();
    });
  });

  if (!matchedVariation) {
    cart.add(product.value.id, quantity.value, null, null, $q, '', openDrawer.value);
    return;
  }

  const selectedVariationsArray = {variation: []};

  for (const attr of matchedVariation.attributes) {
    let resolvedValue = attr.value;

    if (resolvedValue === null || resolvedValue === 'null' || !resolvedValue) {
      resolvedValue = selectedVariations.value[attr.name] ?? '';
    }

    selectedVariationsArray.variation.push({
      attribute: attr.name,
      value: resolvedValue
    });
  }
  cart.add(product.value.id, quantity.value, matchedVariation.id, selectedVariationsArray.variation, $q, '', openDrawer.value);
}
function increaseQty(maxQty) {
  if(quantity.value === maxQty){
    cart.notifyUser($q, 'negative', 'There are only 9 in stock', matError)
    return;
  }
  quantity.value++
}

function decreaseQty() {
  if (quantity.value > 1) quantity.value--
}

async function fetchProduct(slug) {
  let existing = productsStore.products.value.find(p => {
    const pSlug = getSlugFromPermalink(p.permalink)
    return pSlug === slug
  })

  if (existing) {
    product.value = JSON.parse(JSON.stringify(existing))
  } else {
    product.value = await productsStore.fetchSingleProduct(slug)
  }

  if (!product.value) {
    console.error('Product not found:', slug)
    return
  }
}
async function enhanceProduct() {
  if (!product.value) return

  if (!product.value?.categories?.length) {
    product.value.categories = [product.value.extensions?.qwoo?.default_category]
  }

  quantity.value = 1

  await resetVariations()

  // Auto-select from URL query params if present and valid
  const query = route.query
  if (Object.keys(query).length && product.value.attributes) {
    const validAttrNames = product.value.attributes.map(a => a.name)

    for (const [key, value] of Object.entries(query)) {
      if (!validAttrNames.includes(key)) continue

      // Check the value is a valid option for this attribute
      const attr = product.value.attributes.find(a => a.name === key)
      const validOptions = attr?.terms.map(t => t.name.toLowerCase()) || []

      if (validOptions.includes(String(value).toLowerCase())) {
        selectedVariations.value[key] = value
      }
    }

    // Trigger variation matching if we restored any selections
    if (Object.keys(selectedVariations.value).length) {
      await onVariationChange()
    }
  }

  await fetchWishlistData()
}
const isVariable = computed(() => product.value?.type === 'variable')

const selectedVariations = ref({})
const selectedVariation = ref(null)
const variationError = ref('')
const wishlistAdded = ref(false);
function resetVariations() {
  selectedVariations.value = {}
  variationError.value = ''
  selectedVariation.value = null
}

const shouldDisableCartButtons = computed(() => {
  return isVariable.value && (!selectedVariation.value || selectedVariation.value === 'null')
})
async function fetchWishlistData() {

  await wishlist.fetchWishlistItems();

  if (wishlist.state.items && Object.values(wishlist.state.items).find(obj => selectedVariation.value ? selectedVariation.value.id : product.value.id === obj.id)) {
    wishlistAdded.value = true
  } else {
    wishlistAdded.value = false
  }

}

const variationLoading = ref(false)
async function onVariationChange() {
  variationLoading.value = true

  try {
    // Clear any selected values that are no longer valid
    for (const attr of availableAttributes.value) {
      const currentVal = selectedVariations.value[attr.name]

      if (currentVal && !attr.options.includes(currentVal)) {
        selectedVariations.value[attr.name] = null
      }
    }

    if (!product.value || !product.value.attributes) {
      selectedVariation.value = null
      return
    }

    const matched = product.value.variations.find((variation) => {
      return Object.entries(selectedVariations.value).every(([attrName, selectedValue]) => {
        const attr = variation.attributes.find(a => a.name === attrName)

        if (!attr || selectedValue === null) return false

        if (attr.value === null) return true

        return attr.value.toLowerCase() === selectedValue.toLowerCase()
      })
    })

    if (matched) {
      const selectedCount = Object.keys(selectedVariations.value).length
      const variationCount = Object.keys(matched.attributes).length

      if (variationCount === selectedCount) {
        // Fetch full variation data before updating UI
        selectedVariation.value = await fetchProductById(matched.id)
      }

      variationError.value = ''
    } else {
      selectedVariation.value = null
      variationError.value = 'Please select valid variation options.'
    }

    // Ensure no empty selections remain
    for (const [, value] of Object.entries(selectedVariations.value)) {
      if (value == null) {
        selectedVariation.value = null
      }
    }

    // Update URL query params
    const url = new URL(window.location.href)
    url.search = ''

    for (const [key, value] of Object.entries(selectedVariations.value)) {
      if (value) {
        url.searchParams.set(key, value)
      }
    }

    window.history.replaceState({}, '', url.toString())

  } finally {
    variationLoading.value = false
  }
}

function addToCartHandler(e) {
  if (isVariable.value) {
    if (!selectedVariation.value) {
      variationError.value = 'Please select all variation options.'
      return
    }
    addToCart(e)
  } else {
    addToCart(e)
  }
}

async function addToWishlist() {
if(selectedVariation.value){
  await wishlist.toggleWishlistItem(selectedVariation.value.id, $q);
} else {
  await wishlist.toggleWishlistItem(product.value.id, $q);
}

  if (wishlist.state.items && Object.values(wishlist.state.items).find(obj => selectedVariation.value ? selectedVariation.value.id : product.value.id === obj.id)) {
    wishlistAdded.value = false;
  } else{
    wishlistAdded.value = true;
  }
}
const safeDescription = useSanitizedDescription(() => product.value?.description)
const safePrice = useSanitizedPrice(() => product.value?.price_html)
const safeVariationPrice = useSanitizedPrice(() => selectedVariation.value?.price_html)
const safeCategoryName = useSanitizedText(() => product.value?.categories?.[0]?.name)

onMounted(async() => {
  if (process.env.CLIENT) {
    // If no SSR data → fetch
    if (!product.value || !product.value.id) {
      await fetchProduct(route.params.slug)
      await enhanceProduct();
      await imagesCarousel.recompute(true)

    } else {
      enhanceProduct();
      imagesCarousel.recompute(true)

    }
  }

  /*if (process.env.CLIENT) {
    await fetchWishlistData()
  }*/
})

onBeforeRouteUpdate(async (to) => {
  try {
    await fetchProduct(to.params.slug)

  } catch (e) {
    console.error(e)
  }
})

watch(
  () => route.params.slug,
  async (newSlug, oldSlug) => {
    if (newSlug === oldSlug) return


    selectedVariation.value = null
    selectedVariations.value = {}
    variationError.value = ''
    quantity.value = 1

    //await fetchProduct(newSlug)

    enhanceProduct().catch(console.error)
    imagesCarousel.slide.value = 0
    imagesCarousel.recompute(true)

    fetchSeoForPath(`product/${newSlug}`)
      .then(useSeoMeta())
  }
)

const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

const mouseDownTime = ref(0)

function onImageMouseDown() {
  mouseDownTime.value = Date.now()
}

function onImageMouseMove(e) {
  const dx = Math.abs(e.clientX - dragStartX.value)
  const dy = Math.abs(e.clientY - dragStartY.value)
  if (dx > 5 || dy > 5) isDragging.value = true
}

function onImageClick(index) {
  const elapsed = Date.now() - mouseDownTime.value
  if (elapsed > 200) return // was a drag, not a click
  openLightbox(index)
}

</script>

<style scoped>
img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  height: 100%;
}
.category-chip {
  display: inline-flex;
}
</style>
