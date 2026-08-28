<template>
  <div>
    <h2 class="text-h4">My Orders</h2>

    <div v-if="orders && orders.length > 0">
    <q-card dense>
      <q-expansion-item
        v-for="order in orders"
        :key="order.id"
        :label="`Order #${order.number}`"
        :caption="`${order.date_created} | Status: ${order.status}`"
        :icon="matShoppingBag"
        :expand-icon="matKeyboardArrowDown"
        header-class="text-primary text-bold"
        class="q-mb-sm"
        group="somegroup"
        expand-separator
      >
        <div class="q-mt-sm q-pa-md">
          <div class="text-body2 text-grey-7 q-mb-sm">
            Total: {{ order.total }} {{ order.currency }}
          </div>

          <q-table
            :rows="Object.values(order.items)"
            :columns="columns"
            row-key="name"
            dense
            flat
            bordered
            hide-bottom
          >

            <template v-slot:body-cell-thumbnail="props">
              <q-td :props="props">
                <q-img
                  :src="props.row.thumbnail"
                  style="width: 70px; height: 70px;"
                  spinner-color="grey-5"
                  ratio="1"
                  fit="cover"
                  class="rounded-borders"
                />
              </q-td>
            </template>
          </q-table>
        </div>
      </q-expansion-item>
    </q-card>

    </div>
    <div v-else-if="orders && orders.length === 0">No orders yet. <router-link to="/products/">explore our products</router-link> to start your first order!</div>
    <div v-else> <q-spinner color="secondary" size="2em" /> </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { matShoppingBag, matKeyboardArrowDown } from '@quasar/extras/material-icons'
import { fetchWithToken } from 'src/composables/useApiFetch.js'


const orders = ref(null)
const columns = [
  {
    name: 'thumbnail',
    label: '',
    align: 'left',
    field: 'thumbnail',
  },
  {
    name: 'name',
    label: 'Product',
    align: 'left',
    field: 'name',
  },
  {
    name: 'quantity',
    label: 'Qty',
    align: 'center',
    field: 'quantity',
  },
  {
    name: 'total',
    label: 'Total (₪)',
    align: 'right',
    field: 'total',
  }
]

onMounted(async () => {
  const res = await fetchWithToken('/wp-json/qwoo/v1/my-orders');
  orders.value = await res.json();
})
</script>
<style>
.q-expansion-item__container.relative-position .q-icon,
.q-expansion-item__container.relative-position .q-item__label {
    fill: var(--q-secondary);
    color: var(--q-secondary);
}
</style>