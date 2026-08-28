/**
 * More info about this file:
 * https://v2.quasar.dev/quasar-cli-vite/developing-ssr/ssr-webserver
 *
 * Runs in Node context.
 */

/**
 * Make sure to yarn add / npm install (in your project root)
 * anything you import here (except for express and compression).
 */
import express from 'express'
import compression from 'compression'
import { createProxyMiddleware } from 'http-proxy-middleware'
import {
  defineSsrCreate,
  defineSsrListen,
  defineSsrClose,
  defineSsrServeStaticContent,
  defineSsrRenderPreloadTag
} from '#q-app/wrappers'

/**
 * Create your webserver and return its instance.
 * If needed, prepare your webserver to receive
 * connect-like middlewares.
 *
 * Can be async: defineSsrCreate(async ({ ... }) => { ... })
 */

export const create = defineSsrCreate((/* { ... } */) => {
  const app = express()
  app.disable('x-powered-by')

  if (process.env.PROD) {
    app.use(compression())
  }

  const backendTarget = process.env.WP_BACKEND_URL // server-only env var, no VITE_ prefix

  if (backendTarget) {
    const proxySecret = process.env.PROXY_SHARED_SECRET

    // Without this, every proxied request to a protected route (wc/store,
    // qwoo) silently goes out with no X-Proxy-Secret header (or the literal
    // string "undefined") and gets rejected by the backend — which looks
    // like a mysterious outage rather than the misconfiguration it is.
    // Fail at startup instead, where it's obvious what's wrong.
    if (!proxySecret) {
      throw new Error(
        'PROXY_SHARED_SECRET is not set but WP_BACKEND_URL is configured. ' +
        'Set PROXY_SHARED_SECRET (copied from Technical Settings → CORS & Frontend Domain ' +
        'in the qwoo-core plugin) before starting the server.'
      )
    }

    app.use(createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      secure: true,
      pathFilter: (pathname, req) => {
        return (
            pathname.startsWith('/wp-json') ||
            pathname.startsWith('/wp-admin') ||
            req.query['wc-ajax'] !== undefined
        )
      },
      cookieDomainRewrite: {
        [new URL(backendTarget).hostname]: ''
      },
      on: {
        proxyReq: (proxyReq) => {
          proxyReq.setHeader('X-Proxy-Secret', proxySecret)
        }
      }
    }))
  }

  return app
})
/**
 * You need to make the server listen to the indicated port
 * and return the listening instance or whatever you need to
 * close the server with.
 *
 * The "listenResult" param for the "close()" definition below
 * is what you return here.
 *
 * For production, you can instead export your
 * handler for serverless use or whatever else fits your needs.
 *
 * Can be async: defineSsrListen(async ({ app, devHttpsApp, port }) => { ... })
 */
export const listen = defineSsrListen(async ({ app, devHttpsApp, port }) => {
  if (process.env.PROD) {
    // Vercel serverless: no port to listen on — export the app itself,
    // since Express apps are valid (req, res) => {} handlers.
    return { app }
  }

  // Local dev: behave exactly as before
  const server = devHttpsApp || app
  return server.listen(port, () => {})
})

/**
 * Should close the server and free up any resources.
 * Will be used on development only when the server needs
 * to be rebooted.
 *
 * Should you need the result of the "listen()" call above,
 * you can use the "listenResult" param.
 *
 * Can be async: defineSsrClose(async ({ listenResult }) => { ... })
 */
export const close = defineSsrClose(({ listenResult }) => {
  return listenResult.close()
})

const maxAge = process.env.DEV
  ? 0
  : 1000 * 60 * 60 * 24 * 30

/**
 * Should return a function that will be used to configure the webserver
 * to serve static content at "urlPath" from "pathToServe" folder/file.
 *
 * Notice resolve.urlPath(urlPath) and resolve.public(pathToServe) usages.
 *
 * Can be async: defineSsrServeStaticContent(async ({ app, resolve }) => {
 * Can return an async function: return async ({ urlPath = '/', pathToServe = '.', opts = {} }) => {
 */
export const serveStaticContent = defineSsrServeStaticContent(({ app, resolve }) => {
  return ({ urlPath = '/', pathToServe = '.', opts = {} }) => {
    const serveFn = express.static(resolve.public(pathToServe), { maxAge, ...opts })
    app.use(resolve.urlPath(urlPath), serveFn)
  }
})

const jsRE = /\.js$/
const cssRE = /\.css$/
const woffRE = /\.woff$/
const woff2RE = /\.woff2$/
const gifRE = /\.gif$/
const jpgRE = /\.jpe?g$/
const pngRE = /\.png$/

/**
 * Should return a String with HTML output
 * (if any) for preloading indicated file
 */
export const renderPreloadTag = defineSsrRenderPreloadTag((file/* , { ssrContext } */) => {
  if (jsRE.test(file) === true) {
    return `<link rel="modulepreload" href="${file}" crossorigin>`
  }

  if (cssRE.test(file) === true) {
    return `<link rel="stylesheet" href="${file}" crossorigin>`
  }

  if (woffRE.test(file) === true) {
    return `<link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
  }

  if (woff2RE.test(file) === true) {
    return `<link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
  }

  if (gifRE.test(file) === true) {
    return `<link rel="preload" href="${file}" as="image" type="image/gif" crossorigin>`
  }

  if (jpgRE.test(file) === true) {
    return `<link rel="preload" href="${file}" as="image" type="image/jpeg" crossorigin>`
  }

  if (pngRE.test(file) === true) {
    return `<link rel="preload" href="${file}" as="image" type="image/png" crossorigin>`
  }

  return ''
})