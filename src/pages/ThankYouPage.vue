<template>
  <q-page class="q-pa-md">
    <div class="container">
      <div v-if="order" class="q-gutter-md">
        <div class="text-h4 text-center">Thank you!</div>
        <div class="text-subtitle1 text-center">
          Hey {{ order.billing_address.first_name }}. Your order is being processed and will get to you soon!
          Please check your email inbox at <strong>{{ order.billing_address.email }}</strong> for more details.
        </div>

        <q-card class="q-pa-md">
          <q-card-section>
            <div class="text-h6">Order Summary</div>
            <q-separator class="q-my-sm"/>
            <div><strong>Order Number:</strong> {{ order.id }}</div>

            <div v-if="order.totals.total_items === 0 || order.totals.total_items !== order.totals.subtotal"><strong>Subtotal:</strong>
              <span style="text-decoration:line-through;">{{
                  formatCurrency(order.totals.subtotal, {
                    minorUnit: parseInt(order.totals.currency_minor_unit),
                    symbol: order.totals.currency_symbol,
                    prefix: order.totals.currency_prefix,
                    suffix: order.totals.currency_suffix,
                    decimalSeparator: order.totals.currency_decimal_separator,
                    thousandSeparator: order.totals.currency_thousand_separator,
                  })
                }} </span>
              {{
                formatCurrency(order.totals.total_items, {
                  minorUnit: parseInt(order.totals.currency_minor_unit),
                  symbol: order.totals.currency_symbol,
                  prefix: order.totals.currency_prefix,
                  suffix: order.totals.currency_suffix,
                  decimalSeparator: order.totals.currency_decimal_separator,
                  thousandSeparator: order.totals.currency_thousand_separator,
                })
              }}
            </div>
            <div v-else><strong>Subtotal:</strong> {{
                formatCurrency(order.totals.subtotal, {
                  minorUnit: parseInt(order.totals.currency_minor_unit),
                  symbol: order.totals.currency_symbol,
                  prefix: order.totals.currency_prefix,
                  suffix: order.totals.currency_suffix,
                  decimalSeparator: order.totals.currency_decimal_separator,
                  thousandSeparator: order.totals.currency_thousand_separator,
                })
              }}
            </div>
            <div><strong>Shipping:</strong> {{
                formatCurrency(order.totals.total_shipping, {
                  minorUnit: parseInt(order.totals.currency_minor_unit),
                  symbol: order.totals.currency_symbol,
                  prefix: order.totals.currency_prefix,
                  suffix: order.totals.currency_suffix,
                  decimalSeparator: order.totals.currency_decimal_separator,
                  thousandSeparator: order.totals.currency_thousand_separator,
                })
              }}
            </div>
            <div><strong>Total:</strong> {{
                formatCurrency(order.totals.total_price, {
                  minorUnit: parseInt(order.totals.currency_minor_unit),
                  symbol: order.totals.currency_symbol,
                  prefix: order.totals.currency_prefix,
                  suffix: order.totals.currency_suffix,
                  decimalSeparator: order.totals.currency_decimal_separator,
                  thousandSeparator: order.totals.currency_thousand_separator,
                })
              }}
            </div>
          </q-card-section>

          <q-card-section>
            <div class="text-h6 q-mb-md">Products</div>
            <q-table
              :rows="order.items"
              :columns="columns"
              flat
              dense
              row-key="id"
              hide-bottom
            >
              <template v-slot:body-cell-thumbnail="props">
                <q-td>
                  <q-img
                    :src="props.row.images?.[0]?.src"
                    style="width: 100px; height: 100px"
                    spinner-color="grey-5"
                    :alt="props.row.name"
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-total="props">
                <q-td class="text-center">
                  {{
                    formatCurrency(props.row.totals?.line_total, {
                      minorUnit: parseInt(order.totals.currency_minor_unit),
                      symbol: order.totals.currency_symbol,
                      prefix: order.totals.currency_prefix,
                      suffix: order.totals.currency_suffix,
                      decimalSeparator: order.totals.currency_decimal_separator,
                      thousandSeparator: order.totals.currency_thousand_separator,
                    })
                  }}
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>

      <div v-else class="text-center q-my-xl">
        <q-spinner color="secondary" size="lg"/>
        <div class="q-mt-md">Loading your order...</div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useRoute} from 'vue-router'
import {fetchWithToken} from 'src/composables/useApiFetch.js';
import {formatCurrency} from 'src/utils/formatters.js'

const route = useRoute()
const order = ref(null)

const columns = [
  {name: 'thumbnail', label: '', align: 'left', field: 'thumbnail'},
  {name: 'name', label: 'Product', align: 'center', field: 'name'},
  {name: 'quantity', label: 'Qty', align: 'center', field: 'quantity'},
  {name: 'total', label: 'Total', align: 'center', field: 'total'}
]

onMounted(async () => {
  const orderID = route.query.orderId
  const email = route.query.billing_email
  const order_key = route.query.order_key

  try {
    const res = await fetchWithToken(
      `/wp-json/wc/store/v1/order/${orderID}?key=${order_key}&billing_email=${email}`,
      {credentials: 'include'}
    )
    if (!res.ok) {
      throw new Error(`Failed to fetch order: ${res.status}`)
    }
    const data = await res.json()
    order.value = data
  } catch (err) {
    console.error(err)
  }
})
</script>
