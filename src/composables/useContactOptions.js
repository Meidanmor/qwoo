import { ref } from 'vue'

// Module-level (shared) so the fetch only ever happens once no matter how
// many times the component using it gets mounted.
export const contactMethods = ref([])

let loaded = false

export async function loadContactOptions() {
    if (loaded || typeof window === 'undefined') return
    loaded = true

    try {
        const res = await fetch('/wp-json/qwoo/v1/contact-options')
        if (!res.ok) return

        const data = await res.json()

        // Belt-and-braces: even if a method comes back enabled, only keep it if
        // it actually has somewhere to link to. Mirrors the backend rule that
        // the button should never render on "configured but empty" data.
        if (data?.enabled && Array.isArray(data.methods)) {
            contactMethods.value = data.methods.filter(m => m && m.href)
        }
    } catch (err) {
        console.warn('Failed to load contact options', err)
    }
}