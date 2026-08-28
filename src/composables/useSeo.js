// src/composables/useSeoMeta.js
import { ref, useSSRContext } from 'vue'
import { useMeta } from 'quasar'

/**
 * Wires backend SEO data into useMeta consistently across SSR and CSR.
 * Reads synchronously at creation time (not onMounted) to avoid a
 * flash back to empty meta right after hydration.
 */
export function useSeoMeta() {
  const seoData = ref(
      process.env.CLIENT && window.__SEO_DATA__ ? window.__SEO_DATA__ : null
  )

  if (process.env.SERVER) {
    const ssr = useSSRContext()
    seoData.value = ssr?.seoData || null
  }

  useMeta(() => {
    const seo = seoData.value
    if (!seo) return {}

    return {
      title: seo.title || 'Q-Woo',
      meta: {
        robots: { name: 'robots', content: seo.robots || 'index, follow', key: 'robots' },
        description: { name: 'description', content: seo.description || 'Advanced e-commerce shop', key: 'description' },
        ogTitle: { property: 'og:title', content: seo.title || 'Q-Woo', key: 'og:title' },
        ogDescription: { property: 'og:description', content: seo.description || 'Advanced e-commerce shop', key: 'og:description' },
        ogImage: { property: 'og:image', content: seo.og_image, key: 'og:image' },
        ogType: { property: 'og:type', content: seo.og_type || 'website', key: 'og:type' },
      },
      link: {
        canonical: {
          rel: 'canonical',
          href: seo.canonical || (process.env.CLIENT ? window.location.href : '')
        }
      }
    }
  })

  return { seoData }
}
export async function fetchSeoForPath(path, origin='') {
  const API_BASE = origin

  // Define default fallbacks
  const result = {
    title: 'Q-Woo',
    description: "Advanced e-commerce shop",
    robots: 'index, follow, max-image-preview:large',
    canonical: '',
    og_image: '',
    og_type: 'website'
  }

  try {
    const res = await fetch(
        `${API_BASE}/wp-json/qwoo/v1/seo?path=${encodeURIComponent(path)}`
    )

    if (!res.ok) return result

    const json = await res.json()

    // Use the Spread operator (...) to merge the API data
    // into your result object. This keeps all new fields!
    return { ...result, ...json }

  } catch (err) {
    console.error('[fetchSeoForPath] fetch error', err)
    return result
  }
}