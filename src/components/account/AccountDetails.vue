<template>
  <div>
    <h1 class="text-h4">Account Details</h1>

    <!-- Loading state -->
    <div v-if="loading">
      <q-spinner color="secondary" size="2em" />
    </div>

    <!-- Error loading user -->
    <div v-else-if="loadError" class="text-negative">
      {{ loadError }}
    </div>

    <!-- Account form -->
    <div v-else>
      <q-form @submit.prevent="updateDetails">
        <q-input
          v-model="account.first_name"
          label="First Name"
          :disable="saving"
        />
        <q-input
          v-model="account.last_name"
          label="Last Name"
          :disable="saving"
        />
        <q-input
          v-model="account.email"
          label="Email"
          type="email"
          disable
          readonly
        />

        <q-btn
          type="submit"
          label="Save Changes"
          color="secondary"
          :loading="saving"
        />

        <!-- Save feedback -->
        <div v-if="saveError" class="text-negative q-mt-md">{{ saveError }}</div>
        <div v-if="saveSuccess" class="text-positive q-mt-md">Profile updated successfully.</div>
      </q-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { fetchWithToken } from 'src/composables/useApiFetch.js'
const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const account = ref({
  first_name: props?.user?.first_name,
  last_name:  props?.user?.last_name,
  email:      props?.user?.email,
})

const saving     = ref(false)
const saveError  = ref('')
const saveSuccess = ref(false)


// ─── Save changes ─────────────────────────────────────────────────────────────

async function updateDetails() {
  saveError.value   = ''
  saveSuccess.value = false
  saving.value      = true
  try {
    const res  = await fetchWithToken('/wp-json/qwoo/v1/me', {
      method: 'POST',
      body: JSON.stringify({
        first_name: account.value.first_name,
        last_name:  account.value.last_name,
      }),
    })

    const data = await res.json()

    if (!data.success) {
      saveError.value = data.message || 'Failed to save changes. Please try again.'
      return
    }

    // Keep local state in sync with what the server confirmed
    account.value = {
      first_name: data.user.first_name,
      last_name:  data.user.last_name,
      email:      data.user.email,
    }

    saveSuccess.value = true

  } catch (err) {
    console.error('Failed to update account:', err)
    saveError.value = 'A server error occurred. Please try again later.'
  } finally {
    saving.value = false
  }
}
</script>