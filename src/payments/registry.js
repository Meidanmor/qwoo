import stripe from './adapters/stripe'
import cod from './adapters/cod'

const adapters = [stripe, cod]

export function getAdapter(id) {
    return adapters.find(a => a.id === id) || null
}

// Only show UI for methods WooCommerce actually returns for this cart
export function getAvailableAdapters(availableIds = []) {
    return adapters.filter(a => availableIds.includes(a.id))
}