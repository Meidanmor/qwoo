// src/composables/useSanitizedHtml.js
import { computed, toValue } from 'vue'
import { sanitizeDescription, sanitizePriceHtml, sanitizePlainText } from 'src/utils/sanitizeHtml'

export function useSanitizedDescription(source) {
    return computed(() => sanitizeDescription(toValue(source)))
}

export function useSanitizedPrice(source) {
    return computed(() => sanitizePriceHtml(toValue(source)))
}

export function useSanitizedText(source) {
    return computed(() => sanitizePlainText(toValue(source)))
}