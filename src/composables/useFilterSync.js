// src/composables/useFilterSync.js

import { watch } from 'vue'

export function parseQueryFilters(query) {
  const filters = {}

  if (query.q) {
    filters.search = String(query.q)
  }

  if (query.cat) {
    filters.selectedCategory = String(query.cat)
      .split(',')
      .map(Number)
      .filter(Boolean)
  }

  if (query.sort) {
    filters.sortBy = String(query.sort)
  }

  if (query.page) {
    const p = parseInt(query.page, 10)
    if (!isNaN(p) && p > 0) filters.currentPage = p
  }

  const minRaw = parseFloat(query.min_price)
  const maxRaw = parseFloat(query.max_price)

  if (!isNaN(minRaw) || !isNaN(maxRaw)) {
    filters.priceRange = {
      min: !isNaN(minRaw) ? minRaw : null,
      max: !isNaN(maxRaw) ? maxRaw : null
    }
  }

  return filters
}

function buildQuery({ search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage }) {
  const q = {}

  if (search.value) q.q = search.value
  if (selectedCategory?.value?.length) q.cat = selectedCategory.value.join(',')
  if (sortBy.value && sortBy.value !== 'menu_order') q.sort = sortBy.value
  if (currentPage.value && currentPage.value > 1) q.page = currentPage.value

  const min = priceRange.value?.min
  const max = priceRange.value?.max
  const boundsLoaded = priceMin.value !== null && priceMax.value !== null
  if (boundsLoaded) {
    if (min !== undefined && min !== priceMin.value) q.min_price = min
    if (max !== undefined && max !== priceMax.value) q.max_price = max
  }

  return q
}

// ✅ Replaces router.replace — updates URL without triggering Vue Router navigation
function pushToUrl(query) {
  const url = new URL(window.location.href)
  url.search = ''

  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  history.replaceState(history.state, '', url.toString())
}

// ✅ Replaces route.query — reads directly from the browser URL
function getUrlQuery() {
  const params = new URLSearchParams(window.location.search)
  const query = {}
  params.forEach((value, key) => {
    query[key] = value
  })
  return query
}

/**
 * @param {object} refs    - { search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage }
 * @param {object} _router - no longer used, kept for backwards compatibility so call sites don't break
 * @param {object} _route  - no longer used, kept for backwards compatibility
 * @param {object} options
 */
export function useFilterSync(refs, _router, _route, options = {}) {
  const { search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage } = refs

  function initFromQuery() {
    const filters = parseQueryFilters(getUrlQuery()) // ✅ reads from window.location

    if (filters.search !== undefined)           search.value            = filters.search
    if (filters.selectedCategory !== undefined) selectedCategory.value  = filters.selectedCategory
    if (filters.sortBy !== undefined)           sortBy.value            = filters.sortBy
    if (filters.currentPage !== undefined)      currentPage.value       = filters.currentPage

    if (filters.priceRange && options.syncPrice !== false) {
      const clampedMin = filters.priceRange.min !== null
        ? Math.max(filters.priceRange.min, priceMin.value ?? filters.priceRange.min)
        : priceMin.value

      const clampedMax = filters.priceRange.max !== null
        ? Math.min(filters.priceRange.max, priceMax.value ?? filters.priceRange.max)
        : priceMax.value

      priceRange.value = { min: clampedMin, max: clampedMax }
    }
  }

  function startWatching() {
    watch(
      () => ({
        search:           search.value,
        selectedCategory: [...(selectedCategory ? selectedCategory.value : [])],
        priceMin:         priceRange.value?.min,
        priceMax:         priceRange.value?.max,
        sortBy:           sortBy.value,
        currentPage:      currentPage.value,
      }),
      () => {
        const newQuery    = buildQuery({ search, selectedCategory, priceRange, priceMin, priceMax, sortBy, currentPage })
        const currentQuery = getUrlQuery()                              // ✅ reads from window.location

        const isSame = JSON.stringify(newQuery) === JSON.stringify(currentQuery)
        if (!isSame) {
          pushToUrl(newQuery)                                           // ✅ history.replaceState, not router.replace
        }
      },
      { deep: true }
    )
  }

  return { initFromQuery, startWatching }
}