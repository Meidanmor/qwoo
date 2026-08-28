// ssr-src/middlewares/render.js
import { defineSsrMiddleware } from '#q-app/wrappers'
import { randomBytes } from 'crypto'

const WP_BACKEND_URL = process.env.WP_BACKEND_URL || ''

const isIgnoredRequest = (url) => {
    return (
        url.startsWith('/.well-known') ||
        url.includes('devtools') ||
        url.endsWith('.map')
    )
}

export default defineSsrMiddleware(({ app, resolve, render }) => {
    app.get(resolve.urlPath('*'), (req, res) => {
        if (isIgnoredRequest(req.url)) {
            return res.status(404).end()
        }
        const nonce = randomBytes(16).toString('base64')
        res.setHeader('Content-Type', 'text/html')

        res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; " +
            `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com; ` +
            "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; " +
            "img-src 'self' data: https:; " +
            `connect-src 'self' ${WP_BACKEND_URL ? WP_BACKEND_URL : ''} https://api.stripe.com https://hcaptcha.com https://*.hcaptcha.com ws://localhost:* wss://localhost:*;` +
            "font-src 'self' https://fonts.gstatic.com; " +
            "frame-src https://accounts.google.com https://js.stripe.com https://hooks.stripe.com https://hcaptcha.com https://*.hcaptcha.com; " +
            "frame-ancestors 'self';"
        )

        // Clickjacking protection (defense-in-depth alongside frame-ancestors above,
        // for older browsers that don't support CSP frame-ancestors)
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')

        // Prevent MIME-sniffing of responses
        res.setHeader('X-Content-Type-Options', 'nosniff')

        const ssrContext = { req, res }

        render(ssrContext)
            .then(html => {
                // NOTE: html already contains the correct <title>/<meta>/<link>/<script>
                // tags from every useMeta() call in the rendered component tree,
                // injected automatically by Quasar's render() — with the hydration
                // markers the client-side Meta plugin needs to adopt these nodes on
                // navigation. Do NOT strip or replace the <title> here.

                const productData = ssrContext.productData || {}
                const heroData = ssrContext.heroData || {}

                const states = {
                    productData,
                    heroData,
                    brandConfig: ssrContext.brandConfig || [],
                    headerConfig: ssrContext.headerConfig || [],
                    productsData: ssrContext.productsData || [],
                    categoriesData: ssrContext.categoriesData || [],
                    homeProductsData: ssrContext.homeProductsData || [],
                    cartArray: ssrContext.cartArray || null,
                    productsTotal: ssrContext.productsTotal || 0,
                    pagesTotal: ssrContext.pagesTotal || 1,
                    pageConfig: ssrContext.pageConfig || {},
                    selectedCategoryData: ssrContext.selectedCategoryData || {},
                    priceMeta: ssrContext.priceMeta || {},
                    ssrQuery: ssrContext.ssrQuery || {},
                    seoData: ssrContext.seoData || null
                }

                // JSON-LD schema — appended, not replacing anything Quasar produced.
                let schemaHtml = ''
                if (productData && productData.id) {
                    const schema = {
                        "@context": "https://schema.org/",
                        "@type": "Product",
                        "name": productData.name || '',
                        "description": (productData.short_description || '').replace(/<[^>]*>/g, ''),
                        "image": productData.images?.[0]?.src ? [productData.images[0].src] : [],
                        "offers": {
                            "@type": "Offer",
                            "priceCurrency": productData?.prices?.currency_code,
                            "price": productData?.price || '0',
                            "availability": productData?.stock_status === 'instock' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
                        }
                    }
                    schemaHtml = `<script type="application/ld+json" nonce="${nonce}">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`
                }

                const criticalHeadExtra = `
          ${schemaHtml}
          ${WP_BACKEND_URL ? `<link rel="preconnect" href="${WP_BACKEND_URL}">` : ''}
          ${heroData.src ? `
            <link
              rel="preload"
              as="image"
              href="${heroData.src}"
              ${heroData.srcset ? `imagesrcset="${heroData.srcset}"` : ''}
              ${heroData.sizes ? `imagesizes="${heroData.sizes}"` : ''}
              fetchpriority="high"
            >` : ''}
          <style>
            .hero-section-sec, .lcp-wrapper, .hero-img, .q-layout, .q-page-container, #q-app {
              opacity: 1 !important;
              visibility: visible !important;
              transition: none !important;
              animation: none !important;
            }
          </style>
        `

                const bodyBottom = Object.entries(states)
                    .map(([key, value]) => {
                        const globalName = `__${key.replace(/([A-Z])/g, '_$1').toUpperCase()}__`
                        return `<script nonce="${nonce}">window.${globalName} = ${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`
                    })
                    .join('\n')

                const withNonce = html.replace(
                    /<script((?:(?!src=|nonce=)[^>])*)>/g,
                    (match, attrs) => `<script${attrs} nonce="${nonce}">`
                )

                // Append (not replace) — Quasar's own head content stays intact.
                const output = withNonce
                    .replace('</head>', `${criticalHeadExtra}</head>`)
                    .replace('</body>', `${bodyBottom}</body>`)

                res.send(output)
            })
            .catch(err => {
                if (err.url) {
                    if (err.code) res.redirect(err.code, err.url)
                    else res.redirect(err.url)
                } else if (err.code === 404) {
                    res.status(404).send('404 | Page Not Found')
                } else if (process.env.DEV) {
                    console.error('SSR REAL ERROR:', err)
                    console.error(err.stack)
                    res.status(500).send(`<pre style="white-space: pre-wrap; color: red;">${err.stack || err.message}</pre>`)
                } else {
                    res.status(500).send('500 | Internal Server Error')
                    if (process.env.DEBUGGING) console.error(err.stack)
                }
            })
    })
})