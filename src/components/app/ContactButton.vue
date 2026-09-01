<template>
  <div
      v-if="contactMethods.length"
      class="qwoo-contact-btn-wrap"
  >
    <!-- Multiple methods: expanding stack of options above the toggle -->
    <div v-if="contactMethods.length > 1" class="qwoo-contact-options">
      <a
          v-for="method in contactMethods"
          v-show="expanded"
          :key="method.type + method.href"
          :href="method.href"
          target="_blank"
          rel="noopener"
          class="qwoo-contact-option"
          :class="`qwoo-contact-option--${method.type}`"
          :aria-label="labelFor(method)"
          :title="labelFor(method)"
      >
        <span class="qwoo-contact-icon">
          <img
              v-if="method.type === 'custom' && method.icon"
              :src="method.icon"
              :alt="labelFor(method)"
          />
          <span v-else v-html="icons[method.type] || icons.chat"></span>
        </span>
      </a>
    </div>

    <!-- Single method: the button itself IS that method -->
    <a
        v-if="contactMethods.length === 1"
        :href="contactMethods[0].href"
        target="_blank"
        rel="noopener"
        class="qwoo-contact-fab"
        :class="`qwoo-contact-fab--${contactMethods[0].type}`"
        :aria-label="labelFor(contactMethods[0])"
    >
      <span class="qwoo-contact-icon">
        <img
            v-if="contactMethods[0].type === 'custom' && contactMethods[0].icon"
            :src="contactMethods[0].icon"
            :alt="labelFor(contactMethods[0])"
        />
        <span v-else v-html="icons[contactMethods[0].type] || icons.chat"></span>
      </span>
    </a>

    <!-- Multiple methods: generic toggle -->
    <button
        v-else
        type="button"
        class="qwoo-contact-fab qwoo-contact-fab--toggle"
        @click="expanded = !expanded"
        :aria-label="expanded ? 'Close contact options' : 'Contact us'"
        :aria-expanded="expanded"
    >
      <span class="qwoo-contact-icon" v-html="expanded ? icons.close : icons.chat"></span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { contactMethods, loadContactOptions } from 'src/composables/useContactOptions.js'

const expanded = ref(false)

onMounted(() => {
  loadContactOptions()
})

const labels = {
  whatsapp: 'WhatsApp',
  phone: 'Call us',
  email: 'Email us',
  telegram: 'Telegram',
}

function labelFor(method) {
  if (method.type === 'custom') return method.label || 'Contact us'
  return labels[method.type] || 'Contact us'
}

// Small, dependency-free inline icon set — avoids pulling in a brand-icon
// font just for this button.
const icons = {
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5C10.1 9 9.6 7.7 9.4 7.2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.5 5.2L2 22l4.9-1.5C8.4 21.5 10.1 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.7 0-3.3-.5-4.6-1.3l-.3-.2-3.1.9.9-3-.2-.3C3.8 14.6 3.3 13 3.3 11.3 3.3 6.7 7.1 3 11.7 3S20 6.7 20 11.3 16.2 20 12 20z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M6.6 10.8c1.4 2.8 3.7 5 6.5 6.5l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.3 1L6.6 10.8z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M21.9 4.3 18.6 20c-.2 1-.9 1.2-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.6 13.2l-4.7-1.5c-1-.3-1-1 .2-1.5L20.6 3.2c.9-.3 1.6.2 1.3 1.1z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 2C6.5 2 2 5.9 2 10.5c0 2.3 1.1 4.4 3 5.9-.1 1.1-.6 2.4-1.4 3.4-.2.2 0 .5.3.5 1.8-.2 3.4-.9 4.6-1.8 1.1.4 2.3.6 3.5.6 5.5 0 10-3.9 10-8.6S17.5 2 12 2z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7l-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4L10.6 10.6l6.3-6.3z"/></svg>',
}

</script>

<style scoped>
.qwoo-contact-btn-wrap {
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transition: transform .2s ease;
}

/* Shift up while the (full-width) cookie banner is showing so they don't overlap */
.qwoo-contact-btn-wrap--raised {
  transform: translateY(-90px);
}

.qwoo-contact-fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--q-secondary, #333);
  box-shadow: 0 4px 14px rgba(0, 0, 0, .25);
  text-decoration: none;
  border: none;
  cursor: pointer;
}

.qwoo-contact-fab--whatsapp { background: #25D366; }
.qwoo-contact-fab--phone    { background: #2563eb; }
.qwoo-contact-fab--email    { background: #6b7280; }
.qwoo-contact-fab--telegram { background: #229ED9; }

.qwoo-contact-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qwoo-contact-option {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .2);
  text-decoration: none;
  background: var(--q-secondary, #333);
}

.qwoo-contact-option--whatsapp { background: #25D366; }
.qwoo-contact-option--phone    { background: #2563eb; }
.qwoo-contact-option--email    { background: #6b7280; }
.qwoo-contact-option--telegram { background: #229ED9; }

.qwoo-contact-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qwoo-contact-icon :deep(img) {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 50%;
}
</style>