import { fetchWithToken } from 'src/composables/useApiFetch.js'
import {getApiOrigin} from 'src/utils/server/get-api-origin.js';


export const fetchAPI = async (endpoint, ssrContext = null) => {
    const storeBaseURL = `${getApiOrigin(ssrContext)}/wp-json/wc/store/v1`
    try {
        const res = await fetchWithToken(`${storeBaseURL}${endpoint}`, {}, ssrContext)
        if (!res || !res.ok) {
            console.error(`[fetchAPI] WooCommerce API error: ${res?.status ?? 'unknown'}`)
            return null
        }
        return await res.json()
    } catch (err) {
        console.error('[fetchAPI] Failed to fetch:', err)
        return null
    }
}

export async function fetchProductById(id, ssrContext=null) {
    const res = await fetchAPI(`/products/${id}`, ssrContext)
    if (!res) throw new Error('Product not found')
    return res
}