// src/utils/sanitizeHtml.js
import xss, { FilterXSS } from 'xss'

// Only allow safe URL schemes anywhere a URL attribute (href/src) is allowed.
// This is the equivalent of sanitize-html's allowedSchemes/allowedSchemesByTag.
function isSafeUrl(url, allowedSchemes) {
    if (!url) return false
    const trimmed = String(url).trim()
    // relative/protocol-relative/anchor/query urls are fine
    if (/^(\/|\.\/|\.\.\/|#|\?)/.test(trimmed)) return true
    const match = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/)
    if (!match) return true // no scheme at all, e.g. "example.com/x" — treat as relative
    return allowedSchemes.includes(match[1].toLowerCase())
}

// For rich-text fields: product descriptions, category/page content
const descriptionFilter = new FilterXSS({
    whiteList: {
        p: [], br: [], strong: [], em: [], b: [], i: [],
        ul: [], ol: [], li: [], span: [],
        h3: [], h4: [],
        a: ['href', 'target', 'rel'],
        img: ['src', 'alt', 'width', 'height', 'loading']
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
    onTagAttr(tag, name, value) {
        if (tag === 'a' && name === 'href') {
            if (!isSafeUrl(value, ['http', 'https', 'mailto'])) return ''
        }
        if (tag === 'img' && name === 'src') {
            if (!isSafeUrl(value, ['https'])) return ''
        }
    },
    onTag(tag, html, options) {
        if (options.isClosing) {
            // let closing tags (</a>) pass through the default whitelist handling
            return
        }
        if (tag === 'a') {
            // rebuild with forced rel/target, same as sanitize-html's simpleTransform
            const hrefMatch = html.match(/href\s*=\s*"([^"]*)"/i)
            const href = hrefMatch ? hrefMatch[1] : ''
            if (!isSafeUrl(href, ['http', 'https', 'mailto'])) return ''
            return `<a href="${xss.escapeAttrValue(href)}" target="_blank" rel="noopener noreferrer">`
        }
        if (tag === 'img') {
            const srcMatch = html.match(/src\s*=\s*"([^"]*)"/i)
            const altMatch = html.match(/alt\s*=\s*"([^"]*)"/i)
            const src = srcMatch ? srcMatch[1] : ''
            if (!isSafeUrl(src, ['https'])) return ''
            const alt = altMatch ? altMatch[1] : ''
            return `<img src="${xss.escapeAttrValue(src)}" alt="${xss.escapeAttrValue(alt)}" loading="lazy">`
        }
    }
})

// For WooCommerce price_html: just formatting, no links, no lists
const priceFilter = new FilterXSS({
    whiteList: {
        span: ['class'],
        del: ['class'],
        ins: ['class'],
        bdi: []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
})

// For single-line fields that should really just be plain text
// (category names, hero titles) — strips everything
const plainTextFilter = new FilterXSS({
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
})

const heroTitleFilter = new FilterXSS({
    whiteList: { br: [], strong: [], em: [], b: [], i: [], span: [] },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
})

export function sanitizeDescription(html) {
    return descriptionFilter.process(html || '')
}

export function sanitizePriceHtml(html) {
    return priceFilter.process(html || '')
}

export function sanitizePlainText(html) {
    return plainTextFilter.process(html || '')
}

export function sanitizeHeroTitle(html) {
    return heroTitleFilter.process(html || '')
}