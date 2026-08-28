// src/composables/useProductArchive.js
import { ref, computed, onMounted, watch, useSSRContext, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFilterSync, parseQueryFilters } from 'src/composables/useFilterSync'
import { scroll } from 'quasar'
import { fetchSeoForPath, useSeoMeta } from 'src/composables/useSeo'
import productsStore from 'src/stores/products'
import {getApiOrigin} from "src/utils/server/get-api-origin.js";

const { setVerticalScrollPosition } = scroll

export function getSortParams(sort) {
    switch (sort) {
        case 'price_asc':  return { orderby: 'price',      order: 'asc'  }
        case 'price_desc': return { orderby: 'price',      order: 'desc' }
        case 'date_desc':  return { orderby: 'date',       order: 'desc' }
        case 'title_asc':  return { orderby: 'title',      order: 'asc'  }
        case 'title_desc': return { orderby: 'title',      order: 'desc' }
        case 'popularity': return { orderby: 'popularity', order: 'desc' }
        case 'rating':     return { orderby: 'rating',     order: 'desc' }
        default:           return { orderby: 'menu_order', order: 'desc' }
    }
}

export const sortOptions = [
    { label: 'Default',            value: 'menu_order' },
    { label: 'Newest',             value: 'date_desc'  },
    { label: 'Price: Low to High', value: 'price_asc'  },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Name: A to Z',       value: 'title_asc'  },
    { label: 'Name: Z to A',       value: 'title_desc' },
    { label: 'Popularity',         value: 'popularity' },
    { label: 'Rating',             value: 'rating'     },
]

/**
 * mode: 'shop'     -> category comes from URL (checkbox multi-select)
 *       'category' -> category is locked to route.params.slug
 */
export function createArchivePreFetch(mode) {
    return async function preFetch({ ssrContext, currentRoute, redirect }) {

        const categories = await productsStore.prefetchCategories(ssrContext)

        const currentCat = mode === 'category'
            ? categories.find(c => c.slug === currentRoute.params.slug) || null
            : null

        const seoPath = mode === 'category'
            ? `product-category/${currentRoute.params.slug}`
            : 'shop'
        const seo = await fetchSeoForPath(seoPath, getApiOrigin(ssrContext))

        const urlFilters = parseQueryFilters(currentRoute.query)
        const sortParams = getSortParams(urlFilters.sortBy || 'menu_order')
        const minPriceCents = urlFilters.priceRange?.min != null ? Math.floor(urlFilters.priceRange.min * 100) : undefined
        const maxPriceCents = urlFilters.priceRange?.max != null ? Math.ceil(urlFilters.priceRange.max * 100) : undefined

        const categoryParam = mode === 'category'
            ? (currentCat?.id ?? undefined)
            : (urlFilters.selectedCategory?.length ? urlFilters.selectedCategory.join(',') : undefined)

        const priceMetaCategoryArg = mode === 'category'
            ? (currentCat?.id ?? null)
            : (urlFilters.selectedCategory?.length ? urlFilters.selectedCategory : null)

        const requestedPage = urlFilters.currentPage || 1

        const result = await productsStore.preFetchProducts({
            api: true,
            page: requestedPage,
            per_page: 6,
            dryRun: true,
            search: urlFilters.search || undefined,
            category: categoryParam,
            min_price: minPriceCents,
            max_price: maxPriceCents,
            ssrContext,
            ...sortParams
        })

        // ✅ shared page-existence guard
        const totalPages = result.totalPages || 1
        if (requestedPage > totalPages || requestedPage < 1) {
            const cleanQuery = { ...currentRoute.query }
            delete cleanQuery.page
            return redirect({ path: currentRoute.path, query: cleanQuery })
        }

        const priceMeta = await productsStore.prefetchPriceMeta(priceMetaCategoryArg, ssrContext)

        if (ssrContext) {
            ssrContext.urlFilters = urlFilters
            ssrContext.productsData = result.products
            ssrContext.categoriesData = categories
            ssrContext.priceMeta = priceMeta
            ssrContext.productsTotal = result.total
            ssrContext.pagesTotal = result.totalPages
            ssrContext.seoData = seo
            if (mode === 'category') ssrContext.selectedCategoryData = currentCat
        } else {
            window.__PRODUCTS_DATA__ = result.products
            window.__PRODUCTS_TOTAL__ = result.total
            window.__PAGES_TOTAL__ = result.totalPages
            window.__CATEGORIES_DATA__ = categories
            window.__PRICE_META__ = priceMeta
            window.__SEO_DATA__ = seo
            if (mode === 'category') window.__SELECTED_CATEGORY_DATA__ = currentCat
        }

        productsStore.products.value = result.products
        productsStore.totalProducts.value = result.total
        productsStore.totalPages.value = result.totalPages
        productsStore.productsLoading.value = false
    }
}

export function useProductArchive(mode) {
    const router = useRouter()
    const route  = useRoute()

    function scrollToTop() {
        setVerticalScrollPosition(window, 187, 300)
    }

    const selectedCategory    = ref([])
    const selectedCategoryOBJ = ref(null) // meaningful only in 'category' mode
    const search              = ref('')
    const currentPage         = ref(1)
    const perPage             = 6
    const sortBy              = ref('menu_order')
    const filtersOpen         = ref(false)
    const isReady             = ref(false)
    const isInitialising      = ref(true)
    const priceMin            = ref(null)
    const priceMax            = ref(null)
    const priceRange          = ref({ min: 0, max: 1000 })
    const priceChanged        = ref(0)
    const pendingPriceRange   = ref(null)

    useSeoMeta()

    if (process.env.SERVER) {
        const ssr = useSSRContext()
        if (ssr) {
            productsStore.categories.value = ssr.categoriesData || []

            if (mode === 'category') {
                selectedCategoryOBJ.value = ssr.selectedCategoryData || null
                selectedCategory.value = ssr.selectedCategoryData ? [ssr.selectedCategoryData.id] : []
            } else {
                selectedCategory.value = ssr.urlFilters?.selectedCategory || []
            }

            if (ssr.priceMeta) {
                priceMin.value = Number(ssr.priceMeta.min_price) || 0
                priceMax.value = Number(ssr.priceMeta.max_price) || 0
                priceRange.value = (ssr.urlFilters?.priceRange?.min || ssr.urlFilters?.priceRange?.max)
                    ? { min: ssr.urlFilters.priceRange.min ?? priceMin.value, max: ssr.urlFilters.priceRange.max ?? priceMax.value }
                    : { min: priceMin.value, max: priceMax.value }
            }

            if (ssr.urlFilters?.sortBy) sortBy.value = ssr.urlFilters.sortBy
            if (ssr.urlFilters?.currentPage) currentPage.value = ssr.urlFilters.currentPage
        }
    }

    const { initFromQuery, startWatching } = useFilterSync(
        mode === 'category'
            ? { search, priceRange, priceMin, priceMax, sortBy, currentPage }
            : { search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage },
        router, route
    )

    const isHydrated = ref(
        process.env.CLIENT && (productsStore.initialized.value === true || !!(window.__PRODUCTS_DATA__?.length))
    )

    if (process.env.CLIENT) {

        const hasSSRProducts = Array.isArray(window.__PRODUCTS_DATA__) && window.__PRODUCTS_DATA__.length
        const currentCatFromWindow = mode === 'category'
            ? (window.__CATEGORIES_DATA__ || []).find(c => c.slug === route.params.slug) || null
            : null

        if (hasSSRProducts) {
            productsStore.categories.value = window.__CATEGORIES_DATA__ || []
            productsStore.products.value = window.__PRODUCTS_DATA__
            productsStore.initialized.value = true
            productsStore.productsLoading.value = false

            if (mode === 'category') {
                selectedCategoryOBJ.value = window.__SELECTED_CATEGORY_DATA__ || currentCatFromWindow
                selectedCategory.value = selectedCategoryOBJ.value ? [selectedCategoryOBJ.value.id] : []
            }

            if (window.__PRICE_META__) {
                priceMin.value = Number(window.__PRICE_META__.min_price) || 0
                priceMax.value = Number(window.__PRICE_META__.max_price) || 0
                priceRange.value = { min: priceMin.value, max: priceMax.value }
            }

            if (window.__PRODUCTS_TOTAL__) productsStore.totalProducts.value = window.__PRODUCTS_TOTAL__
            if (window.__PAGES_TOTAL__) productsStore.totalPages.value = window.__PAGES_TOTAL__

            initFromQuery()
        } else if (productsStore.initialized.value) {
            productsStore.categories.value = window.__CATEGORIES_DATA__ || []

            if (mode === 'category') {
                selectedCategoryOBJ.value = currentCatFromWindow
                selectedCategory.value = currentCatFromWindow ? [currentCatFromWindow.id] : []
            }

            if (window.__PRICE_META__) {
                priceMin.value = Number(window.__PRICE_META__.min_price)
                priceMax.value = Number(window.__PRICE_META__.max_price)
                priceRange.value = { min: priceMin.value, max: priceMax.value }
            }
            initFromQuery()
        }

        isReady.value = true
    }

    const decodeHtml = (html = '') => html
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#039;/g, "'")

    const categoryOptions = computed(() => {
        if (!Array.isArray(productsStore.categories.value)) return []
        return productsStore.categories.value.map(cat => ({ label: decodeHtml(cat.name), value: cat.id }))
    })

    const paginatedProducts = computed(() => productsStore.products.value || [])
    const totalPages    = computed(() => productsStore.totalPages.value)
    const totalProducts = computed(() => productsStore.totalProducts.value)

    if (process.env.CLIENT && window.__PRODUCTS_TOTAL__) productsStore.totalProducts.value = window.__PRODUCTS_TOTAL__
    if (process.env.CLIENT && window.__PAGES_TOTAL__) productsStore.totalPages.value = window.__PAGES_TOTAL__

    function onPriceChange() { priceChanged.value++ }

    async function fetchPriceMeta(category = null) {
        const data = await productsStore.prefetchPriceMeta(category)
        pendingPriceRange.value = { min: Number(data.min_price), max: Number(data.max_price) }
        return data
    }

    let requestId = 0
    watch(
        () => ({
            category: selectedCategory.value,
            search: search.value,
            page: currentPage.value,
            sort: sortBy.value,
            priceTrigger: priceChanged.value
        }),
        async (filters, prev) => {
            if (isInitialising.value || !isReady.value || priceRange.value.min === null || priceRange.value.max === null) return

            const currentRequest = ++requestId

            const categoryChanged = mode === 'shop' && prev &&
                JSON.stringify([...filters.category].sort()) !== JSON.stringify([...prev.category].sort())

            const shouldResetPage = prev && (
                filters.search !== prev.search || filters.priceTrigger !== prev.priceTrigger || categoryChanged
            )

            if (categoryChanged) {
                productsStore.productsLoading.value = true
                await fetchPriceMeta(filters.category)
                priceMin.value = pendingPriceRange.value.min
                priceMax.value = pendingPriceRange.value.max
                priceRange.value = { ...pendingPriceRange.value }
            }

            if (currentRequest !== requestId) return
            if (shouldResetPage && currentPage.value !== 1) { currentPage.value = 1; return }

            const min = Math.floor(priceRange.value.min * 100)
            const max = Math.ceil(priceRange.value.max * 100)
            const sortParams = getSortParams(filters.sort)

            const categoryArg = mode === 'category'
                ? (selectedCategoryOBJ.value?.id ?? null)
                : (filters.category.length ? filters.category.join(',') : null)

            await productsStore.preFetchProducts({
                api: true, page: currentPage.value, per_page: perPage,
                min_price: min, max_price: max, category: categoryArg,
                search: filters.search, ...sortParams
            })

            if (currentRequest !== requestId) return
            if (categoryChanged) {
                priceMin.value = pendingPriceRange.value.min
                priceMax.value = pendingPriceRange.value.max
                priceRange.value = { ...pendingPriceRange.value }
            }
        }
    )

    // ── only category pages react to slug changes (nav between categories) ──
    if (mode === 'category') {
        watch(
            () => route.params.slug,
            async (newSlug) => {
                if (!Array.isArray(productsStore.categories.value) || !productsStore.categories.value.length) {
                    await productsStore.prefetchCategories()
                }
                const cat = productsStore.categories.value.find(c => c.slug === newSlug)
                if (!cat) return

                selectedCategoryOBJ.value = cat
                selectedCategory.value = [cat.id]
                productsStore.products.value = []
                productsStore.productsLoading.value = true

                await fetchPriceMeta(cat.id)
                priceMin.value = pendingPriceRange.value.min
                priceMax.value = pendingPriceRange.value.max
                priceRange.value = { ...pendingPriceRange.value }

                await productsStore.preFetchProducts({ api: true, page: 1, per_page: perPage, category: cat.id })
                productsStore.productsLoading.value = false
            }
        )
    }

    onMounted(async () => {
        isHydrated.value = true

        if (mode === 'category' && window.__SELECTED_CATEGORY_DATA__) {
            selectedCategoryOBJ.value = window.__SELECTED_CATEGORY_DATA__
            selectedCategory.value = [window.__SELECTED_CATEGORY_DATA__.id]
            window.__SELECTED_CATEGORY_DATA__ = null
        }

        if (window.__PRODUCTS_DATA__) {
            productsStore.products.value = window.__PRODUCTS_DATA__
            productsStore.totalProducts.value = window.__PRODUCTS_TOTAL__
            productsStore.totalPages.value = window.__PAGES_TOTAL__
            productsStore.initialized.value = true
            productsStore.productsLoading.value = false
            window.__PRODUCTS_DATA__ = null
            window.__PRODUCTS_TOTAL__ = null
            window.__PAGES_TOTAL__ = null
        } else if (!productsStore.initialized.value) {
            productsStore.productsLoading.value = true
            await productsStore.preFetchProducts({
                api: true, page: 1, per_page: perPage,
                category: mode === 'category' ? (selectedCategoryOBJ.value?.id || null) : undefined
            })
        }

        if (!priceMin.value) {
            await fetchPriceMeta(mode === 'category' ? (selectedCategoryOBJ.value?.id || null) : null)
            priceMin.value = pendingPriceRange.value.min
            priceMax.value = pendingPriceRange.value.max
            priceRange.value = { ...pendingPriceRange.value }
            initFromQuery()
        }

        if (!Array.isArray(productsStore.categories.value) || !productsStore.categories.value.length) {
            await productsStore.prefetchCategories()
        }

        if (!isReady.value) isReady.value = true

        startWatching()
        await nextTick()
        isInitialising.value = false
    })

    return {
        search, selectedCategory, selectedCategoryOBJ, currentPage, sortBy, filtersOpen,
        priceMin, priceMax, priceRange, isHydrated,
        categoryOptions, paginatedProducts, totalPages, totalProducts,
        sortOptions, onPriceChange, scrollToTop, productsStore,
    }
}