import { reactive, computed, toRaw } from 'vue'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
import productsStore from 'src/stores/products'
import { matShoppingCart, matError, matCloudOff } from '@quasar/extras/material-icons'
import { fetchProductById } from 'src/api/woocommerce.js'
import { getApiOrigin } from 'src/utils/server/get-api-origin'
/* -------------------------
   Constants
   ------------------------- */
const storeApiBase = (ssrContext) => `${getApiOrigin(ssrContext)}/wp-json/wc/store/v1`

//const STORE_API_BASE = `${import.meta.env.VITE_API_BASE}/wp-json/wc/store/v1`
const LOCAL_CART_KEY = 'local_cart_v1'
const LEGACY_OFFLINE_KEY = 'offline_cart'
const DEBUG = import.meta.env.DEV

/* -------------------------
   State
   ------------------------- */
const state = reactive({
  cart_array: null,
  local_cart: { items: [] },
  items: [],
  items_count: 0,
  totals: {},
  coupons: [],
  loading: { cart: false, quickbuy: false },
  error: null,
  offline: typeof window !== 'undefined' ? !navigator.onLine : false,
  drawerOpen: false,
  synced: false,
  rejected_items: [],
})

/* -------------------------
   Cart fetch wrapper

   Why Cart-Token is required here:
   The WC Store API supports two session mechanisms:
     1. Cookie (wp_woocommerce_session_xxx) -- only works same-origin
     2. Cart-Token header -- designed for cross-origin / headless setups

   Since this frontend runs on a different origin than WordPress,
   the browser cannot persist the WC session cookie (blocked by
   SameSite/Secure cookie restrictions). Every cookie-only request
   looks like a brand new visitor -> empty cart.

   The Cart-Token is a rolling token: WC returns a fresh one on every
   response, but it always points to the same underlying session as long
   as you echo the latest one back. We store the most recent token in
   localStorage and send it on every request.

   The token is scoped to this tab's localStorage, so incognito windows
   get their own token -> their own isolated cart session.

   Note: Cache-Control / Pragma headers are intentionally NOT sent.
   They are non-simple headers that trigger a CORS preflight (OPTIONS)
   request, which fails if the server doesn't explicitly allow them.
   Caching is already disabled at the LiteSpeed level for /wp-json/wc/.
   ------------------------- */


/* -------------------------
   Tiny helpers
   ------------------------- */
function notifyUser($q, type, message, icon=matError) {
  if ($q?.notify) $q.notify({ type, message, icon })
}

function markCartChanged() {
  state.synced = false
}

/* -------------------------
   Signature / key utilities
   ------------------------- */
function normalizeVariation(variation) {
  if (!variation) return []
  if (Array.isArray(variation)) {
    return variation
        .map(v => {
          if (!v) return { attribute: '', value: '' }
          if (typeof v === 'string') return { attribute: '', value: String(v) }
          const attribute = v.attribute ?? v.name ?? v.option ?? ''
          const value = v.value ?? v.option ?? ''
          return { attribute: String(attribute), value: String(value) }
        })
        .filter(v => v.attribute !== '' || v.value !== '')
        .sort((a, b) => (a.attribute + a.value).localeCompare(b.attribute + b.value))
  }
  if (typeof variation === 'object') {
    if ('attribute' in variation || 'value' in variation || 'name' in variation) {
      const attribute = variation.attribute ?? variation.name ?? ''
      const value = variation.value ?? variation.option ?? ''
      if (attribute === '' && (value === '' || typeof value === 'undefined')) return []
      return [{ attribute: String(attribute), value: String(value) }]
    }
    return Object.entries(variation)
        .map(([k, v]) => {
          const val = (v && typeof v === 'object' && 'value' in v) ? v.value : v
          return {attribute: String(k), value: val == null ? '' : String(val)}
        })
        .filter(v => v.attribute !== '' || v.value !== '')
        .sort((a, b) => (a.attribute + a.value).localeCompare(b.attribute + b.value))
  }
  return [{ attribute: '', value: String(variation) }]
}

function itemSignature(itemLike) {
  if (!itemLike) return '0::'
  const id = (typeof itemLike.id !== 'undefined' && itemLike.id !== null) ? String(itemLike.id) : '0'
  const variationArr = normalizeVariation(itemLike.variation)
  const varSig = variationArr
      .map(v => `${v.attribute || ''}:${v.value || ''}`)
      .filter(Boolean)
      .sort()
      .join('|')
  return `${id}::${varSig}`
}

function buildSig(productId, variationArr) {
  const varSig = variationArr
      .map(v => `${v.attribute || ''}:${v.value || ''}`)
      .filter(Boolean)
      .sort()
      .join('|')
  return `${productId}::${varSig}`
}

function generateLocalKeyForSig(sig) {
  let h = 5381
  for (let i = 0; i < sig.length; i++) h = ((h << 5) + h) + sig.charCodeAt(i)
  const num = (h >>> 0).toString(36)
  const friendly = sig.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 18)
  return `local-${num}-${friendly}`
}

/* -------------------------
   Stock / limits helper
   ------------------------- */
function getMaxAllowed(item) {
  if (!item) return Infinity

  if (item.quantity_limits && typeof item.quantity_limits.maximum === 'number') {
    const m = item.quantity_limits.maximum
    return (m === null || Number.isNaN(m)) ? Infinity : m
  }
  if (item.add_to_cart && typeof item.add_to_cart.maximum === 'number') {
    const m = item.add_to_cart.maximum
    return (m === null || Number.isNaN(m)) ? Infinity : m
  }
  const stockText = item?.stock_availability?.text
  if (stockText && String(stockText).trim() !== '') {
    const m = String(stockText).match(/\d+/)
    if (m) return parseInt(m[0], 10)
  }
  return Infinity
}

/* -------------------------
   Product cache lookup
   ------------------------- */
async function getCachedProduct(productId) {
  try {
    const fromStore = productsStore.getById(Number(productId))
    if (fromStore) return fromStore
  } catch (err) {
    if (DEBUG) console.warn('[cart] getCachedProduct store lookup failed', err)
  }

  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cache = await caches.open('products-cache')
      const res = await cache.match('/api/products')
      if (res?.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const found = data.find(p => Number(p.id) === Number(productId))
          if (found) return found
        }
      }
    }
  } catch (err) {
    if (DEBUG) console.warn('[cart] getCachedProduct cache read failed', err)
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await productsStore.fetchProductsIfNeeded()
      const fromAfterFetch = productsStore.getById(Number(productId))
      if (fromAfterFetch) return fromAfterFetch
    }
  } catch (err) {
    if (DEBUG) console.warn('[cart] getCachedProduct fetch failed', err)
  }

  return null
}

let productsJsonCache = null
async function getProductFromJson(productId) {
  try {
    if (!productsJsonCache) {
      const res = await fetch('/data/products.json')
      productsJsonCache = await res.json()
      if (!Array.isArray(productsJsonCache)) productsJsonCache = []
    }
    return productsJsonCache.find(p => Number(p.id) === Number(productId)) || null
  } catch (err) {
    if (DEBUG) console.warn('[cart] getProductFromJson failed', err)
    return null
  }
}

/* -------------------------
   Local item builder
   ------------------------- */
function buildLocalItemFromProduct(productLike, variation = [], quantity = 1, variationId = null) {
  const images = productLike?.images ?? []
  const prices = productLike?.prices ?? {}
  const normalizedVariation = normalizeVariation(variation)

  const temp = {
    id: variationId || productLike?.id || 0,  // ← use variationId when available
    name: productLike?.name || productLike?.title || '',
    permalink: productLike?.permalink || '',
    quantity: quantity || 1,
    quantity_limits: {
      maximum: productLike?.add_to_cart?.maximum ?? null,
      minimum: productLike?.add_to_cart?.minimum ?? 1,
      multiple_of: productLike?.add_to_cart?.multiple_of ?? 1
    },
    prices,
    images,
    variation: normalizedVariation,
    _local: true,
    _synced: false
  }
  const sig = itemSignature(temp)
  temp.key = generateLocalKeyForSig(sig)
  return temp
}

/* -------------------------
   Persistence
   ------------------------- */
function persistLocalCart() {
  const isClient = typeof window !== 'undefined'
  if (!isClient) return
  try {
    const raw = state.local_cart.items.map(item => toRaw(item))
    const data = JSON.stringify(raw)
    localStorage.setItem(LOCAL_CART_KEY, data)
    localStorage.setItem(LEGACY_OFFLINE_KEY, data)
  } catch (err) {
    if (DEBUG) console.warn('[cart] persistLocalCart failed', err)
  }
}

// Singleton promise — loadLocalCart() runs exactly once per page load.
// Any caller that arrives while it's still running gets the same promise
// rather than starting a second concurrent read from localStorage.
let _localCartLoadPromise = null

async function loadLocalCart() {
  if (_localCartLoadPromise) return _localCartLoadPromise
  _localCartLoadPromise = _doLoadLocalCart()
  return _localCartLoadPromise
}

async function _doLoadLocalCart() {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY)
    let items = []
    if (raw) {
      items = JSON.parse(raw) || []
    } else {
      const legacy = localStorage.getItem(LEGACY_OFFLINE_KEY)
      if (legacy) items = JSON.parse(legacy) || []
    }

    // Normalize and dedupe by signature (sum quantities)
    const map = new Map()
    for (const it of items) {
      const normalized = {
        ...it,
        variation: normalizeVariation(it.variation || []),
        _local: it._local ?? true,
        _synced: it._synced ?? false,
        _removed: it._removed ?? false
      }
      const sig = itemSignature(normalized)

      // Don't merge tombstones with live items — tombstones are kept as-is
      if (normalized._removed) {
        map.set(`__removed__${sig}`, normalized)
        continue
      }

      if (map.has(sig)) {
        const existing = map.get(sig)
        existing.quantity = (existing.quantity || 0) + (normalized.quantity || 0)
        existing.name = existing.name || normalized.name
        existing.prices = existing.prices || normalized.prices
        existing.images = existing.images || normalized.images
      } else {
        normalized.key = normalized.key || generateLocalKeyForSig(sig)
        map.set(sig, normalized)
      }
    }

    state.local_cart.items = Array.from(map.values())
    persistLocalCart()
  } catch (err) {
    if (DEBUG) console.warn('[cart] loadLocalCart failed', err)
    state.local_cart.items = []
  }

  rebuildMergedView()
}

/* -------------------------
   Merged view (local-first)
   Filter out _removed tombstones before rendering
   ------------------------- */
function rebuildMergedView() {
  const visible = (state.local_cart.items || []).filter(i => !i._removed)
  state.items.splice(0, state.items.length, ...visible)
  state.items_count = state.items.reduce((s, i) => s + (i.quantity || 0), 0)

  if (state.cart_array?.totals) {
    // Server totals are authoritative when available
    state.totals = state.cart_array.totals
    state.coupons = state.cart_array.coupons || []
  } else {
    // Compute local totals from item prices
    const totalItems = state.items.reduce((s, it) => {
      const unitPrice = parseInt(it.prices?.price ?? it.prices?.regular_price ?? 0, 10)
      return s + unitPrice * (it.quantity || 1)
    }, 0)

    const currencyCode = state.items[0]?.prices?.currency_code ?? 'USD'
    const currencyMinorUnit = state.items[0]?.prices?.currency_minor_unit ?? 2
    const currencySymbol = state.items[0]?.prices?.currency_symbol ?? '$'
    const currencyPrefix = state.items[0]?.prices?.currency_prefix ?? currencySymbol

    state.totals = {
      currency_code: currencyCode,
      currency_minor_unit: currencyMinorUnit,
      currency_symbol: currencySymbol,
      currency_prefix: currencyPrefix,
      currency_suffix: state.items[0]?.prices?.currency_suffix ?? '',
      currency_decimal_separator: state.items[0]?.prices?.currency_decimal_separator ?? '.',
      currency_thousand_separator: state.items[0]?.prices?.currency_thousand_separator ?? ',',
      total_items: String(totalItems),
      total_items_tax: '0',
      total_fees: '0',
      total_fees_tax: '0',
      total_discount: '0',
      total_discount_tax: '0',
      total_shipping: '0',
      total_shipping_tax: '0',
      total_price: String(totalItems),
      total_tax: '0',
      tax_lines: [],
      // Flag so consuming components know this is estimated, not server-confirmed
      _local: true,
    }
    state.coupons = []
  }
}

/* -------------------------
   applyServerSnapshot
   ------------------------- */
function applyServerSnapshot(data) {
  state.cart_array = data || null
  state.synced = true
  state.error = null

  const serverMap = new Map(
      (state.cart_array?.items || []).map(i => [itemSignature(i), i])
  )

  // Only reconcile non-tombstone local items
  for (const li of state.local_cart.items) {
    if (li._removed) continue
    const match = serverMap.get(itemSignature(li))
    if (match) {
      li._syncStatus = 'synced'
      li.remote_key = match.key || li.remote_key
      if (match.prices) li.prices = match.prices
    } else {
      // Only mark as rejected if it was previously synced (server knew about it)
      // Items still pending their first sync are left alone
      if (li._syncStatus === 'synced' || li.remote_key) {
        li._syncStatus = 'rejected'
      }
    }
  }

  // ✅ Remove local items that the server rejected (out of stock, deleted, etc.)
  // These are non-removed local items that attempted to sync but aren't on the server
  const rejectedItems = state.local_cart.items.filter(i =>
      !i._removed && i._syncStatus === 'rejected'
  )


  if (rejectedItems.length) {
    // Store them separately so we can notify the user
    state.rejected_items = rejectedItems.map(i => ({...toRaw(i)}))
    // Remove them from local cart
    state.local_cart.items = state.local_cart.items.filter(i =>
        i._removed || i._synced === true
    )
    persistLocalCart()
  } else {
    state.rejected_items = []
  }

  rebuildMergedView()
}

/* -------------------------
   Signature equality check
   ------------------------- */
function localAndServerSignaturesEqual() {
  // Include quantity so a quantity-only change is detected as a diff
  // and triggers a sync on next page load.
  const local = (state.local_cart.items || [])
      .filter(i => !i._removed)
      .map(i => `${itemSignature(i)}:${i.quantity || 0}`)
      .sort()
      .join('|')

  const server = ((state.cart_array && state.cart_array.items) || [])
      .map(i => `${itemSignature(i)}:${i.quantity || 0}`)
      .sort()
      .join('|')

  return local === server
}

const needsSyncComputed = computed(() => {
  if (state.offline) return false
  if (state.synced === false) return true
  return !localAndServerSignaturesEqual()
})

/* -------------------------
   Debounced sync scheduler

   cancelSync() lets individual mutations (like remove()) cancel any
   in-flight debounce before doing their own direct API call, preventing
   the debounced sync from firing afterwards with stale local state.
   ------------------------- */
let __syncDebounceTimer = null
const SYNC_DEBOUNCE_MS = 700

function cancelPendingSync() {
  if (__syncDebounceTimer) {
    clearTimeout(__syncDebounceTimer)
    __syncDebounceTimer = null
  }
}

function scheduleSyncLocalToServer() {
  cancelPendingSync()
  __syncDebounceTimer = setTimeout(() => {
    syncLocalCartWithServer().catch(err => {
      if (DEBUG) console.warn('[cart] scheduled sync failed', err)
    })
    __syncDebounceTimer = null
  }, SYNC_DEBOUNCE_MS)
}

/* -------------------------
   Sync guard — prevents overlapping sync calls.
   If a sync is already running when a new one is triggered, the new
   call waits for the current one to finish, then runs once more to
   pick up any mutations that happened during the in-flight sync.
   ------------------------- */
let __syncInFlight = null
let __syncPendingAfter = false

async function syncLocalCartWithServer() {
  if (state.offline) return state.cart_array || null
  if (typeof window === 'undefined') return state.cart_array || null

  // If a sync is already running, queue exactly one follow-up
  if (__syncInFlight) {
    __syncPendingAfter = true
    return __syncInFlight
  }

  __syncInFlight = _runSync()
      .finally(() => {
        __syncInFlight = null
        if (__syncPendingAfter) {
          __syncPendingAfter = false
          // Re-run after the current stack unwinds
          Promise.resolve().then(() => syncLocalCartWithServer())
        }
      })

  return __syncInFlight
}

/* -------------------------
   PRIMARY SYNC — native WC Store API

   Strategy:
     1. Diff local vs server using itemSignature().
     2. For each diff, call the appropriate Store API endpoint:
          POST /cart/add-item        – new items
          POST /cart/update-item     – quantity changes  (needs server `key`)
          POST /cart/remove-item     – removals / tombstones (needs server `key`)
     3. Every WC Store API endpoint returns the full cart on success.
        We use the LAST successful response as the authoritative snapshot.
        This is correct because actions are sequential — each response
        reflects all prior mutations in this sync pass.
     4. Clean up tombstones BEFORE calling applyServerSnapshot() so they
        don't pollute the reconciliation loop inside applyServerSnapshot().
   ------------------------- */
async function _runSync() {
  if(state.offline === true) return;
  // NEW: never diff against an unknown server state.
  // A null cart_array here means we don't actually know what's on the
  // server (e.g. hard refresh with no SSR data) — fetching first prevents
  // us from mistaking existing server items for brand-new ones.
  if (!state.cart_array) {
    try {
      const res = await fetchWithToken(`${storeApiBase(null)}/cart`, { credentials: 'include' })
      if (res.ok) state.cart_array = await res.json()
    } catch (err) {
      if (DEBUG) console.warn('[cart] _runSync: pre-fetch of server cart failed', err)
    }
  }

  // Skip if nothing has actually changed
  if (state.synced === true) {
    try {
      if (localAndServerSignaturesEqual()) return state.cart_array || null
    } catch (err) {
      if (DEBUG) console.warn('[cart] signature compare failed, proceeding to sync', err)
    }
  }

  state.loading.cart = true
  try {
    const serverItems = state.cart_array?.items || []
    const apiMap = new Map(serverItems.map(i => [itemSignature(i), i]))

    // ── Build action list ────────────────────────────────────────────────
    const actions = []
    const removedServerKeys = new Set()

    for (const localItem of state.local_cart.items) {
      const sig = itemSignature(localItem)
      const apiItem = apiMap.get(sig)

      // Tombstone → remove from server if it exists there
      if (localItem._removed) {
        const serverKey = apiItem?.key || localItem.remote_key
        if (serverKey && !removedServerKeys.has(serverKey)) {
          actions.push({ type: 'remove', payload: { key: serverKey } })
          removedServerKeys.add(serverKey)
        }
        continue
      }



      const maxAllowed = getMaxAllowed(apiItem || localItem)
      if (Number.isFinite(maxAllowed) && localItem.quantity > maxAllowed) {
        localItem.quantity = maxAllowed
      }

      if (apiItem) {
        // Item exists on server — update quantity if different
        if ((localItem.quantity || 0) !== (apiItem.quantity || 0)) {
          if (apiItem.key) {
            actions.push({
              type: 'update',
              payload: { key: apiItem.key, quantity: Number(localItem.quantity) }
            })
          } else {
            // No server key yet — re-add with correct quantity
            actions.push({
              type: 'add',
              payload: {
                id: localItem.id,
                quantity: Number(localItem.quantity),
                variation: localItem.variation
              }
            })
          }
        }
      } else {
        // Item is not on server at all — add it
        actions.push({
          type: 'add',
          payload: {
            id: localItem.id,
            quantity: Number(localItem.quantity),
            variation: localItem.variation
          }
        })
      }
    }

    // Check for items on server that are no longer local
    // (e.g. cleared while offline then came back online)
    const localSigs = new Set(
        state.local_cart.items.filter(i => !i._removed).map(i => itemSignature(i))
    )
    for (const serverItem of serverItems) {
      if (!localSigs.has(itemSignature(serverItem)) &&
          serverItem.key &&
          !removedServerKeys.has(serverItem.key)
      ) {
        actions.push({ type: 'remove', payload: { key: serverItem.key } })
        removedServerKeys.add(serverItem.key)
      }
    }

    // Tombstones with no server key are already resolved (item was never on
    // the server, or was already removed). Clean them up regardless of whether
    // there are other actions to execute, so they don't linger in local state.
    const hadKeylessTombstones = state.local_cart.items.some(
        i => i._removed && !apiMap.get(itemSignature(i))?.key && !i.remote_key
    )

    if (actions.length === 0) {
      // Clean up any keyless tombstones before snapshotting
      if (hadKeylessTombstones) {
        state.local_cart.items = state.local_cart.items.filter(i => !i._removed)
        persistLocalCart()
      }
      applyServerSnapshot(state.cart_array)
      return state.cart_array
    }

    // ── Execute actions, keep rolling the snapshot ───────────────────────
    // FIX: finalData starts as null. It is updated on every *successful*
    // response (each of which is a full cart). If no action succeeds,
    // we fall back to the existing state.cart_array.
    let finalData = null

    for (const act of actions) {
      const endpoint =
          act.type === 'add'    ? 'add-item' :
              act.type === 'update' ? 'update-item' :
                  'remove-item'

      let body = act.payload

      // WC Store API expects variation as { attribute, value } objects
      if (act.type === 'add' && Array.isArray(body.variation) && body.variation.length) {
        body = {
          ...body,
          variation: body.variation.map(v => ({
            attribute: v.attribute,
            value: v.value
          }))
        }
      }

      try {
        const res = await fetchWithToken(`${storeApiBase(null)}/cart/${endpoint}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        const resData = await res.json().catch(() => null)

        if (!res.ok) {
          // Special case: remove-item returns 'invalid key' when the item was
          // already gone from the server (e.g. user removed it, refreshed before
          // the sync completed, and the tombstone was still in localStorage).
          // The desired end state is already true (item gone from server), so
          // treat this as a success. No cart body comes back, so finalData is
          // not updated here -- after the loop we fall back to state.cart_array.
          if (act.type === 'remove' && resData?.code === 'woocommerce_rest_cart_invalid_key') {
            if (DEBUG) console.log('[cart] remove-item: item already gone, treating as success')
            if (resData?.data?.cart) finalData = resData.data.cart
            continue
          }

          if (DEBUG) console.warn(`[cart] Store API ${act.type} failed`, resData)
          //continue
        } else {
          // Each successful response IS the full cart -- roll it forward
          if (resData) finalData = resData

        }


      } catch (err) {
        if (DEBUG) console.warn(`[cart] Store API ${act.type} error`, err)
        // Network error -- keep rolling, try next action
      }
    }

    // ── FIX: Clean tombstones BEFORE applyServerSnapshot ─────────────────
    // applyServerSnapshot() iterates local_cart.items to reconcile with the
    // server. Tombstones still present during that loop appear as unmatched
    // local items, causing phantom re-syncs on the next debounce tick.
    state.local_cart.items = state.local_cart.items.filter(i => !i._removed)

    // Use the last successful response, or fall back to current server state
    applyServerSnapshot(finalData || state.cart_array)
    return state.cart_array

  } catch (err) {
    if (DEBUG) console.warn('[cart] _runSync failed', err)
    state.error = err.message || String(err)
    state.synced = false
    throw err
  } finally {
    state.loading.cart = false
  }
}

/* -------------------------
   LOGIN MERGE — dedicated path, distinct from _runSync()

   Why this can't just reuse syncLocalCartWithServer():
   _runSync() treats the server as the "current known state" and removes
   any server item that isn't present locally (that logic exists to handle
   the "cleared while offline, came back online" case). Right after login,
   the server cart may legitimately contain items the guest never had —
   items saved from a previous logged-in session on this or another device.
   Those must be PRESERVED, not deleted.

   Merge rules (server-only items are always kept):
     - Local-only item          → add to server
     - Same item, same qty      → no-op
     - Same item, different qty → update server to the LOCAL quantity
     - Server-only item         → left untouched, never removed
   ------------------------- */
function hydrateLocalCartFromServer(serverCart) {
  if (!serverCart?.items) {
    state.local_cart.items = []
    persistLocalCart()
    rebuildMergedView()
    return
  }

  state.local_cart.items = serverCart.items.map(serverItem => ({
    key: generateLocalKeyForSig(itemSignature(serverItem)),

    // Server identity
    remote_key: serverItem.key,

    // Product data
    id: serverItem.id,
    name: serverItem.name,
    permalink: serverItem.permalink,
    quantity: serverItem.quantity,
    variation: normalizeVariation(serverItem.variation || []),

    // Data used by the UI
    prices: serverItem.prices || {},
    images: serverItem.images || [],
    quantity_limits: serverItem.quantity_limits
        ? { ...serverItem.quantity_limits }
        : {
          editable: true,
          maximum: getMaxAllowed(serverItem),
          minimum: 1,
          multiple_of: 1
        },

    // Local metadata
    _local: true,
    _removed: false,
    _syncStatus: 'synced'
  }))

  persistLocalCart()
  rebuildMergedView()
}
async function mergeLocalCartWithServer() {
  if (state.offline) return state.cart_array || null
  if (typeof window === 'undefined') return state.cart_array || null

  state.loading.cart = true
  try {
    // Always fetch a fresh server snapshot — right after login, any cached
    // cart_array may still reflect the pre-login (guest) session.
    let serverData = null
    try {
      const res = await fetchWithToken(`${storeApiBase(null)}/cart`, { credentials: 'include' })
      if (res.ok) serverData = await res.json()
    } catch (err) {
      if (DEBUG) console.warn('[cart] mergeLocalCartWithServer: fetch server cart failed', err)
    }
    state.cart_array = serverData

    //console.log(serverData)
    const serverItems = serverData?.items || []
    const apiMap = new Map(serverItems.map(i => [itemSignature(i), i]))

    const actions = []

    for (const localItem of state.local_cart.items) {
      // Tombstones represent "remove" intent from the guest session. A brand
      // new server cart has no knowledge of them, so there's nothing to
      // remove — just let them drop out on the next normal sync pass.
      if (localItem._removed) continue

      const sig = itemSignature(localItem)
      const apiItem = apiMap.get(sig)

      const maxAllowed = getMaxAllowed(apiItem || localItem)
      if (Number.isFinite(maxAllowed) && localItem.quantity > maxAllowed) {
        localItem.quantity = maxAllowed
      }

      if (apiItem) {
        if ((localItem.quantity || 0) !== (apiItem.quantity || 0)) {
          if (apiItem.key) {
            actions.push({
              type: 'update',
              payload: { key: apiItem.key, quantity: Number(localItem.quantity) }
            })
          } else {
            actions.push({
              type: 'add',
              payload: {
                id: localItem.id,
                quantity: Number(localItem.quantity),
                variation: localItem.variation
              }
            })
          }
        }
        // else: identical quantity on both sides — nothing to do
      } else {
        // Local-only — add it. Deliberately no corresponding pass over
        // serverItems to remove anything: server-only items are kept as-is.
        actions.push({
          type: 'add',
          payload: {
            id: localItem.id,
            quantity: Number(localItem.quantity),
            variation: localItem.variation
          }
        })
      }
    }

    if (actions.length === 0) {
      applyServerSnapshot(state.cart_array)
      hydrateLocalCartFromServer(state.cart_array)

      return state.cart_array
    }

    let finalData = null

    for (const act of actions) {
      const endpoint = act.type === 'add' ? 'add-item' : 'update-item'
      let body = act.payload

      if (act.type === 'add' && Array.isArray(body.variation) && body.variation.length) {
        body = {
          ...body,
          variation: body.variation.map(v => ({ attribute: v.attribute, value: v.value }))
        }
      }

      try {
        const res = await fetchWithToken(`${storeApiBase(null)}/cart/${endpoint}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        const resData = await res.json().catch(() => null)

        if (!res.ok) {
          if (DEBUG) console.warn(`[cart] merge ${act.type} failed`, resData)
          continue
        }
        if (resData) finalData = resData
      } catch (err) {
        if (DEBUG) console.warn(`[cart] merge ${act.type} error`, err)
      }
    }

    const snapshot = finalData || state.cart_array

    applyServerSnapshot(snapshot)
    hydrateLocalCartFromServer(snapshot)
    return state.cart_array
  } catch (err) {
    if (DEBUG) console.warn('[cart] mergeLocalCartWithServer failed', err)
    state.error = err.message || String(err)
    throw err
  } finally {
    state.loading.cart = false
  }
}

/* -------------------------
   fetchCartOnce (deduped)
   ------------------------- */
let cartFetchPromise = null

async function fetchCartOnce(forceSync = false) {
  if (cartFetchPromise) return cartFetchPromise
  const isClient = typeof window !== 'undefined'

  cartFetchPromise = (async () => {
    try {
      // FIX: await loadLocalCart() before checking needsSyncComputed.
      // loadLocalCart() is a singleton — if it already ran, this resolves
      // immediately. If it's still in progress, we wait for it.
      // Without this await, needsSyncComputed sees an empty local cart
      // and skips the sync even when localStorage has items.
      if (isClient) await loadLocalCart()
      if (state.offline) return state.cart_array

      if (forceSync || needsSyncComputed.value) {
        return await syncLocalCartWithServer()
      } else {
        return await fetchCart()
      }
    } finally {
      cartFetchPromise = null
    }
  })()

  return cartFetchPromise
}

/* -------------------------
   fetchCart
   ------------------------- */
async function fetchCart(force = false, ssrContext = null, { authoritative = false } = {}) {
  if (state.synced && !force) return
  if (DEBUG) console.log('[cart] fetchCart called')

  const isClient = typeof window !== 'undefined'

  if (state.offline) {
    // loadLocalCart is a singleton — safe to call, resolves instantly if already loaded
    if (isClient) await loadLocalCart()
    state.cart_array = null
    rebuildMergedView()
    return
  }

  state.error = null
  try {
    if (isClient) await loadLocalCart()

    let res
    res = await fetchWithToken(`${storeApiBase(ssrContext)}/cart`, { credentials: 'include' }, ssrContext)

    if (!res.ok) throw new Error('Failed to fetch cart')
    const data = await res.json()

    if(ssrContext){
      //console.log(data)
      return data;
    }
    state.cart_array = data
    if (authoritative) {
      // Server is known to be the correct state right now (e.g. a
      // background session-revalidation check) — don't merge with
      // whatever local_cart currently holds, replace it outright.
      applyServerSnapshot(data)
      hydrateLocalCartFromServer(data)
    } else {
      rebuildMergedView()
    }
    return data

  } catch (err) {
    state.error = err.message
    if (isClient) await loadLocalCart()
    state.cart_array = null
    rebuildMergedView()
    state.synced = false
  } finally {
    state.loading.cart = false
    state.loading.quickbuy = false
  }
}

/* -------------------------
   add() sub-functions
   ------------------------- */
function _finishAdd($q, openDrawer = true) {
  persistLocalCart()
  rebuildMergedView()
  scheduleSyncLocalToServer()
  notifyUser($q, 'positive', 'Added to cart', matShoppingCart)
  state.loading.cart = false
  if (openDrawer) state.drawerOpen = true
}

function _addToExistingLocalItem(localItem, quantity, $q, openDrawer = true) {
  const maxAllowed = getMaxAllowed(localItem)
  const current = localItem.quantity || 0
  const addQty = maxAllowed === Infinity ? quantity : Math.min(quantity, maxAllowed - current)

  if (addQty <= 0) {
    notifyUser($q, 'negative', 'No more stock available', matError)
    state.loading.cart = false
    return
  }

  localItem.quantity = current + addQty
  localItem._removed = false
  _finishAdd($q, openDrawer)
}

function _addFromApiItem(apiItem, quantity, variationArr, variationId, $q, openDrawer = true) {
  const maxAllowed = getMaxAllowed(apiItem)
  const existingItem = state.local_cart.items.find(
      i => itemSignature(i) === itemSignature(apiItem) && !i._removed
  )
  const currentQty = existingItem ? (existingItem.quantity || 0) : 0
  const intendedQty = currentQty + quantity
  const clampQty = maxAllowed === Infinity ? intendedQty : Math.min(intendedQty, maxAllowed)

  if (clampQty <= (apiItem.quantity || 0)) {
    notifyUser($q, 'negative', 'Only 0 more available for this product.', matError)
    state.loading.cart = false
    return
  }

  const normalizedVariation = normalizeVariation(
      Array.isArray(apiItem.variation) ? apiItem.variation : variationArr
  )
  const clone = {
    id: apiItem.id,
    variationID: variationId || 0,
    name: apiItem.name || '',
    permalink: apiItem.permalink || '',
    quantity: clampQty,
    prices: apiItem.prices || {},
    images: apiItem.images || [],
    variation: normalizedVariation,
    quantity_limits: apiItem.quantity_limits
        ? { ...apiItem.quantity_limits }
        : { editable: true, maximum: maxAllowed, minimum: 1, multiple_of: 1 },
    _local: true,
    _synced: false
  }
  clone.key = generateLocalKeyForSig(itemSignature(clone))
  state.local_cart.items.push(clone)
  _finishAdd($q, openDrawer)
}

async function _addNewItem(productId, quantity, variationArr, variationId, productDataFromUI, $q, openDrawer = true) {
  let productData = productDataFromUI
  if (!productData) {
    try { productData = await getCachedProduct(productId) } catch { productData = null }
  }
  if (!productData) productData = await getProductFromJson(productId)

  let variationData = null
  if (variationId) {
    try { variationData = await getCachedProduct(variationId) } catch (err){console.log(err)}
    if (!variationData) variationData = await fetchProductById(variationId)
  }

  let sourceProduct = productData || {
    id: productId, name: '', images: [], prices: {},
    add_to_cart: { minimum: 1, maximum: null },
    stock_availability: { text: '' }
  }

  if (variationData?.prices) {
    sourceProduct = { ...sourceProduct, prices: variationData?.prices }
  }

  const localItemNew = buildLocalItemFromProduct(sourceProduct, variationArr, quantity, variationId)
  const maxAllowedNew = getMaxAllowed(localItemNew)
  if (maxAllowedNew !== Infinity && localItemNew.quantity > maxAllowedNew) {
    localItemNew.quantity = maxAllowedNew
    notifyUser($q, 'negative', `Only ${maxAllowedNew} available for this product`, matError)
  }

  state.local_cart.items.push(localItemNew)
  _finishAdd($q, openDrawer)
}

/* -------------------------
   Public cart mutations
   ------------------------- */
async function add(productId, quantity = 1, _variationId = null, variation = {}, $q = null, productDataFromUI = null, openDrawer = true) {
  markCartChanged()
  state.loading.cart = true
  state.error = null

  const variationArr = normalizeVariation(variation)

  // Use variationId for signature when available, just like the stored item
  const sigId = _variationId || productId
  const sig = buildSig(sigId, variationArr)

  const localItem = state.local_cart.items.find(i => itemSignature(i) === sig)
  if (localItem) return _addToExistingLocalItem(localItem, quantity, $q, openDrawer)

  const apiItem = (state.cart_array?.items || []).find(i => itemSignature(i) === sig)
  if (apiItem) return _addFromApiItem(apiItem, quantity, variationArr, _variationId, $q, openDrawer)

  return _addNewItem(productId, quantity, variationArr, _variationId, productDataFromUI, $q, openDrawer)
}

async function increase(productIdOrKey, $q = null) {
  markCartChanged()
  let localItem = null

  if (typeof productIdOrKey === 'string' && productIdOrKey.startsWith('local-')) {
    localItem = state.local_cart.items.find(i => i.key === productIdOrKey)
  } else {
    localItem = state.local_cart.items.find(i => itemSignature(i) === String(productIdOrKey))
    if (!localItem) {
      const idNum = Number(productIdOrKey)
      if (!Number.isNaN(idNum)) {
        localItem =
            state.local_cart.items.find(i => Number(i.id) === idNum && normalizeVariation(i.variation).length === 0) ||
            state.local_cart.items.find(i => Number(i.id) === idNum)
      }
    }
  }

  if (localItem) {
    const max = getMaxAllowed(localItem)
    if (max !== Infinity && (localItem.quantity || 0) >= max) {
      notifyUser($q, 'negative', `Reached max stock (${max}) for ${localItem.name || 'item'}`, matError)
      return
    }
    localItem.quantity = Number(localItem.quantity || 0) + 1
    persistLocalCart()
    rebuildMergedView()
    scheduleSyncLocalToServer()
    notifyUser($q, 'info', 'Quantity updated', matShoppingCart)
    return
  }

  // Fallback: create minimal local item
  const minimal = {
    id: productIdOrKey, name: '', quantity: 1,
    prices: {}, images: [], variation: [], _local: true, _synced: false
  }
  const sig = itemSignature(minimal)
  minimal.key = generateLocalKeyForSig(sig)
  state.local_cart.items.push(minimal)
  persistLocalCart()
  rebuildMergedView()
  scheduleSyncLocalToServer()
  notifyUser($q, 'info', 'Quantity updated', matShoppingCart)
}

async function decrease(cartItemKey) {
  markCartChanged()

  const locIdx = state.local_cart.items.findIndex(
      i => i.key === cartItemKey || itemSignature(i) === cartItemKey
  )

  if (locIdx !== -1) {
    const item = state.local_cart.items[locIdx]
    item.quantity = (item.quantity || 0) - 1

    if (item.quantity <= 0) {
      // FIX: Replace the live item with a tombstone in-place (same index)
      // rather than splice + push. This prevents a brief moment where
      // rebuildMergedView() sees neither the live item nor the tombstone.
      state.local_cart.items.splice(locIdx, 1, {
        key: generateLocalKeyForSig(itemSignature(item)),
        id: item.id,
        quantity: 0,
        variation: normalizeVariation(item.variation || []),
        _local: true,
        _removed: true,
        _synced: false
      })
    }

    persistLocalCart()
    rebuildMergedView()
    scheduleSyncLocalToServer()
    return
  }

  // Not local: create a local override from the API item
  const apiItem = (state.cart_array?.items || []).find(
      i => i.key === cartItemKey || i.id === cartItemKey
  )
  if (!apiItem) return

  const desired = (apiItem.quantity || 1) - 1
  if (desired <= 0) {
    state.local_cart.items.push({
      key: generateLocalKeyForSig(itemSignature(apiItem)),
      id: apiItem.id,
      quantity: 0,
      variation: normalizeVariation(apiItem.variation || []),
      _local: true,
      _removed: true,
      _synced: false
    })
  } else {
    state.local_cart.items.push({
      key: generateLocalKeyForSig(itemSignature(apiItem)),
      id: apiItem.id,
      name: apiItem.name,
      permalink: apiItem.permalink,
      quantity: desired,
      prices: apiItem.prices || {},
      images: apiItem.images || [],
      variation: normalizeVariation(apiItem.variation || []),
      quantity_limits: apiItem.quantity_limits
          ? { ...apiItem.quantity_limits }
          : { editable: true, maximum: getMaxAllowed(apiItem), minimum: 1, multiple_of: 1 },
      _local: true,
      _synced: false
    })
  }

  persistLocalCart()
  rebuildMergedView()
  scheduleSyncLocalToServer()
}

/* -------------------------
   remove()

   FIX: Unified to a single path — always goes optimistic-local-first,
   then syncs via the debounced sync. The old "online + API item → remove
   directly via Store API" fast path was the source of drift because:
     1. It bypassed the debounce, but didn't cancel any pending debounced
        sync, so the debounced sync could fire after and re-add the item.
     2. It had its own applyServerSnapshot() call separate from the normal
        sync flow, creating two competing sources of truth.

   Now: mutate local immediately, cancel any pending debounce, and let
   syncLocalCartWithServer() be the single place that talks to the API.
   The cancelPendingSync() + immediate scheduleSyncLocalToServer() ensures
   the remove fires in the next tick rather than waiting for the debounce
   that was accumulating from a prior add/increase.
   ------------------------- */
async function remove(cartItemKey = null, cartItemAPIKey = null, $q = null) {
  markCartChanged()
  state.error = null

  // Find the item — check local first, then fall back to API cart
  const localIdx = state.local_cart.items.findIndex(i => i.key === cartItemKey)

  if (localIdx !== -1) {
    // Live local item → replace with tombstone so the sync knows to remove it server-side
    const item = state.local_cart.items[localIdx]
    const remoteKey = item.remote_key || cartItemAPIKey || null

    state.local_cart.items.splice(localIdx, 1, {
      key: generateLocalKeyForSig(itemSignature(item)),
      id: item.id,
      quantity: 0,
      variation: normalizeVariation(item.variation || []),
      remote_key: remoteKey,
      _local: true,
      _removed: true,
      _synced: false
    })

    persistLocalCart()
    rebuildMergedView()
    notifyUser($q, 'positive', 'Removed from cart', matShoppingCart)

    if (!state.offline) {
      // Cancel any accumulated debounce and fire sync immediately
      cancelPendingSync()
      scheduleSyncLocalToServer()
    }
    return
  }

  // Item isn't in local_cart — it only exists in cart_array (API-only item,
  // e.g. loaded fresh from server before any local mutation).
  const apiItem = (state.cart_array?.items || []).find(
      i => i.key === cartItemAPIKey || i.remote_key === cartItemAPIKey
  )

  if (!apiItem) {
    if (DEBUG) console.warn('[cart] remove(): item not found locally or in API cart', { cartItemKey, cartItemAPIKey })
    return
  }

  // Create a tombstone for the API item so the sync can remove it
  state.local_cart.items.push({
    key: generateLocalKeyForSig(itemSignature(apiItem)),
    id: apiItem.id,
    quantity: 0,
    variation: normalizeVariation(apiItem.variation || []),
    remote_key: apiItem.key || cartItemAPIKey,
    _local: true,
    _removed: true,
    _synced: false
  })

  persistLocalCart()
  rebuildMergedView()
  notifyUser($q, state.offline ? 'info' : 'positive', state.offline ? 'Removed from cart (local)' : 'Removed from cart', state.offline ? matCloudOff : matShoppingCart)

  if (!state.offline) {
    cancelPendingSync()
    scheduleSyncLocalToServer()
  }
}

/*async function clearCoupons() {
  const response = await fetchWithToken('/wp-json/wc/store/v1/cart/coupons', {
    method: 'DELETE',
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to clear coupons')
  }
  const data = await response.json()
  state.cart_array = data // Store API returns the updated cart
  return data
}*/

async function resetCartIdentity() {
  markCartChanged()
  cancelPendingSync()          // kill any in-flight debounce using the old token/state
  //clearCoupons()

  state.cart_array = null      // ← the missing piece: force _runSync's prefetch branch
  state.synced = false
  state.local_cart.items = []
  state.items = []
  state.items_count = 0
  state.totals = {}
  state.coupons = []
  persistLocalCart()
  rebuildMergedView()
  // token is already gone by the time this runs (clearUser() ran first) —
  // this fetch mints a fresh guest cart/token instead of relying on
  // whatever _runSync would have diffed against
  //await fetchCart(true, null, { authoritative: true })
}

/* -------------------------
   Coupons
   ------------------------- */
async function applyCoupon(code) {
  try {
    const res = await fetchWithToken(`${storeApiBase(null)}/cart/apply-coupon`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    const data = await res.json()
    if (!res.ok) {
      if(data?.message){
        const parser = new DOMParser();
        const errorMsg = parser.parseFromString(data.message, 'text/html').documentElement.textContent;

        throw new Error(errorMsg)
      } else {
      throw new Error('Coupon failed')
        }
    }
    applyServerSnapshot(data || null)
  } catch (err) {
    if (DEBUG) console.error('[cart] applyCoupon failed', err)
    throw err
  }
}

async function removeCoupon(code) {
  try {
    const res = await fetchWithToken(`${storeApiBase(null)}/cart/remove-coupon`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    const data = await res.json()
    if (!res.ok) throw new Error('Coupon removal failed')
    applyServerSnapshot(data || null)
  } catch (err) {
    if (DEBUG) console.error('[cart] removeCoupon failed', err)
    throw err
  }
}

/* -------------------------
   Checkout
   Uses syncLocalCartWithServer (native Store API) before placing order
   ------------------------- */
async function placeOrder(payload) {
  // Ensure server reflects local cart before placing order
  await syncLocalCartWithServer()

  try {
    const deviceId = localStorage.getItem('pwa_device_id') || null
    if (deviceId) payload.pwa_device_id = deviceId

    const res = await fetchWithToken(`${storeApiBase(null)}/checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Checkout failed')
    // Cancel any pending sync
    cancelPendingSync()

    // Clear local cart
    state.local_cart.items = []
    persistLocalCart()
    rebuildMergedView()

    state.cart_array = data || null
    state.synced = true

    return data
  } catch (err) {
    if (DEBUG) console.error('[cart] placeOrder failed', err.message)
    throw err
  }
}

/* -------------------------
   Init
   ------------------------- */
if (typeof window !== 'undefined') {
  loadLocalCart();
  // No need to call it separately here — doing so would race with
  // fetchCartOnce and cause needsSyncComputed to evaluate on a half-loaded state.

  window.addEventListener('online', async () => {
    state.offline = false
    try {
      await fetchCart()
      await syncLocalCartWithServer()
    } catch (err) {
      if (DEBUG) console.warn('[cart] online sync failed', err)
    }
  })

  window.addEventListener('offline', () => {
    state.offline = true
  })

  window.addEventListener('storage', e => {
    if (e.key === LOCAL_CART_KEY || e.key === LEGACY_OFFLINE_KEY) {
      try {
        state.local_cart.items = JSON.parse(e.newValue || '[]')
        rebuildMergedView()
      } catch (err) {
        if (DEBUG) console.warn('[cart] storage sync failed', err)
      }
    }
  })
}

/* -------------------------
   Computed
   ------------------------- */
const hasItems = computed(() => state.items.length > 0)

/* -------------------------
   Exports
   ------------------------- */
export default {
  fetchCartOnce,
  notifyUser,
  state,
  hasItems,
  add,
  increase,
  decrease,
  remove,
  //clear,
  resetCartIdentity,
  fetchCart,
  applyCoupon,
  removeCoupon,
  placeOrder,
  syncLocalCartWithServer,
  mergeLocalCartWithServer,
  // Exposed for post-hydration sync on pages that consume window.__CART_ARRAY__
  loadLocalCart,
  needsSync: () => needsSyncComputed.value,
  signatureFor(productId, variationArray) {
    const varArr = Array.isArray(variationArray) ? variationArray : normalizeVariation(variationArray)
    const varSig = varArr
        .map(v => `${v.attribute || ''}:${v.value || ''}`)
        .filter(Boolean)
        .sort()
        .join('|')
    return `${productId}::${varSig}`
  }
}