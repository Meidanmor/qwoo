// shared
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
}

export function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from(rawData, c => c.charCodeAt(0))
}

export function getDeviceId() {
    let deviceId = localStorage.getItem('pwa_device_id')
    if (!deviceId) {
        deviceId = generateUUID()
        localStorage.setItem('pwa_device_id', deviceId)
    }
    return deviceId
}
export async function saveSubscription(payload) {
    const res = await fetch('/wp-json/qwoo/v1/pwa/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    return res.json()
}

export async function syncCartToken(deviceId, cartToken, status="hidden") {
    return fetch('/wp-json/qwoo/v1/pwa/update-cart-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ device_id: deviceId, cart_token: cartToken, status: status })
    })
}