export function getApiOrigin(ssrContext) {
    if (import.meta.env.SSR) {
        const req = ssrContext?.req
        if (!req) throw new Error('getApiOrigin() called during SSR without ssrContext.req')
        const protocol = req.headers['x-forwarded-proto'] || 'https'
        const host = req.headers['x-forwarded-host'] || req.headers.host
        return `${protocol}://${host}`
    }
    return '' // client: relative path resolves against current page automatically
}