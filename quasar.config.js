// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file
import 'dotenv/config'
import { defineConfig } from '#q-app/wrappers'
import fs from 'fs'
import path from 'path'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appConfigPath = resolve(__dirname, 'public/config/pwa.json')

function loadAppConfig() {
  if (!existsSync(appConfigPath)) {
    return {}
  }

  try {
    return JSON.parse(readFileSync(appConfigPath, 'utf-8'))
  } catch (e) {
    console.warn('Could not parse app-config.json:', e.message)
    return {}
  }
}

export default defineConfig((ctx) => {
  const appConfig = loadAppConfig()
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
     preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    /*htmlVariables: {
      csp: `
        default-src 'self';
        script-src 'self' https://accounts.google.com 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https:;
        connect-src 'self' ${process.env.WP_BACKEND_URL};
        font-src 'self' https://fonts.gstatic.com;
        frame-src https://accounts.google.com;
  `,
      head: `
    <link rel="preconnect" href="${process.env.WP_BACKEND_URL}" crossorigin>
    <link rel="dns-prefetch" href="${process.env.WP_BACKEND_URL}">
     `
    },
    htmlVariablesRender: {
      csp: (val) => val.replace(/\s+/g, ' ').trim(),
      head: (val) => val.trim()
    },*/
    //boot: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: [
      'app.css'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      //'roboto-font', // optional, you are not bound to it
      //'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20'
      },

      vueRouterMode: 'history', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
       //analyze: true,
      // env: {},
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      // extendViteConf (viteConf) {},
      // viteVuePluginOptions: {},

      cssCodeSplit: true,
      preloadChunks: false,   // ensures critical JS is preloaded
      polyfills: {
        coreJs: false        // PWA modern browsers don't need heavy polyfills
      },
      vitePlugins: [
        ['vite-plugin-checker', {
          eslint: {
            lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{js,mjs,cjs,vue}"',
            useFlatConfig: true
          }
        }, {server: false}],
      ],
      /*extendViteConf(viteConf, {isClient, isServer}) {
        // ONLY apply manualChunks to the client build
        if (isClient) {
          viteConf.build.rollupOptions = {
            ...viteConf.build.rollupOptions,
            output: {
              ...viteConf.build.rollupOptions?.output,
              manualChunks(id) {
                // Group all Quasar components into one file
                if (id.includes('node_modules/quasar/')) {
                  return 'quasar-vendor';
                }
                // Group Vue core libraries
                if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/')) {
                  return 'vue-vendor';
                }
              }
            }
          };
        }
      }*/
      // quasar.config.js -> build section
      extendViteConf(viteConf, {isClient}) {
        const isCapacitor = ctx.mode.capacitor;

        viteConf.optimizeDeps = viteConf.optimizeDeps || {}

        // Externalize Capacitor plugins from the bundle (build time)
        // Applied to BOTH client and server passes to prevent Rollup resolution errors
        viteConf.build = viteConf.build || {}
        viteConf.build.rollupOptions = viteConf.build.rollupOptions || {}

        if (!isCapacitor) {
          viteConf.optimizeDeps.exclude = [
            '@capgo/capacitor-social-login',
            '@capacitor/splash-screen'
          ]

          viteConf.build.rollupOptions.external = [
            ...(viteConf.build.rollupOptions.external || []),
            '@capgo/capacitor-social-login',
            '@capacitor/splash-screen'
          ]
        }


        viteConf.build.modulePreload = {
          resolveDependencies: (filename, deps) => {
            // Filter out Quasar components from the 'preload' list
            // This forces the browser to wait until the 5-second timer to even start the download
            return deps.filter(dep => !dep.includes('QLayout') && !dep.includes('QList') && !dep.includes('QItemSection') && !dep.includes('use-quasar'));
          },
        }
        if (isClient) {
          viteConf.build.rollupOptions = {
            ...viteConf.build.rollupOptions,

            output: {
              ...viteConf.build.rollupOptions?.output,
              /*manualChunks(id) {
                // If the file is an observer, force it into its own async chunk
                if (
                    id.includes('quasar/src/components/scroll-observer') ||
                    id.includes('quasar/src/components/resize-observer') ||
                    id.includes('quasar/src/directives/touch-pan') ||
                    id.includes('quasar/src/directives/touch-hold') ||
                    id.includes('quasar/src/utils/format')) {
                  return 'quasar-observers-delayed';
                }

                // DO NOT group the rest of quasar here.
                // Let Vite handle the rest automatically so your
                // defineAsyncComponent logic actually creates separate files.
              }*/
            }
          };
        }
        // ... inside extendViteConf
        viteConf.resolve.alias = {
          'src/services/push/push.js': isCapacitor
              ? path.resolve(__dirname, 'src/services/push/native.js')
              : path.resolve(__dirname, 'src/services/push/web.js'),
          ...viteConf.resolve.alias
        };
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
devServer: {
  https: (() => {
    if (!ctx.dev || ctx.mode.capacitor) return false // no https needed at all here
    const keyPath = './certs/localhost-key.pem'
    const certPath = './certs/localhost.pem'
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    }
    return false
  })(),
  port: 9000,
  host: '0.0.0.0',
  open: !ctx.mode.capacitor,

  proxy: ctx.mode.capacitor ? {} : {

    '/wp-json': {
      target: process.env.WP_BACKEND_URL || '',
      changeOrigin: true,
      secure: true,
      cookieDomainRewrite: process.env.WP_BACKEND_URL
          ? { [new URL(process.env.WP_BACKEND_URL).hostname]: 'localhost' }
          : {},
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('X-Proxy-Secret', process.env.PROXY_SHARED_SECRET || '')
        })
      }
    }
  }
},

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {
        brand: {
          primary: '#FFFFFF',
          secondary: '#005DAC',
          accent: '#005DAC',
          dark: '#1d1d1d',
          'dark-page': '#121212',
          positive: '#21BA45',
          negative: '#C10015',
          info: '#c9c5c0',
          warning: '#F2C037'
        },
        loadingBar: {
          color: 'secondary',
          size: '5px',
          position: 'top'
        }
      },
      cssAddon: false,

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //

      /*components: [
          // Only list the components you REALLY need above the fold
        'QLayout',
        'QHeader',
        'QToolbar',
        'QBtn',
        'QImg'
      ],*/

     /* directives: [
          'TouchPan',   // only if you use it
        //'Ripple',
      ],*/


      // Quasar plugins
      plugins: ['Notify','Meta','LoadingBar','Dialog'],
      //removeDefaultCss: true
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-service-worker',
    //   pwaServiceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    //   bexManifestFile: 'src-bex/manifest.json
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000, // The default port that the production server should use
                      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render' // keep this as last one
      ],

      manualMetaInjection: true,
      // extendPackageJson (json) {},
      //extendSSRWebserverConf (/*esbuildConf*/) {manualMetaInjection: true /*Ensure Quasar uses meta from ssrContext*/ },

      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      pwa: true,
      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!

      // pwaExtendGenerateSWOptions (cfg) {},
      // pwaExtendInjectManifestOptions (cfg) {}
      criticalCSS: true,
      prodScriptNamedExport: 'app'
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}', 'data/categories.json', 'data/price-meta.json', 'config/*'],
      },
      workboxMode: 'InjectManifest', // 'GenerateSW' or 'InjectManifest'
      injectManifest: {
        workboxMode: 'injectManifest',
        swSrc: 'src-pwa/custom-service-worker.js',
        swDest: 'service-worker.js',
        injectPwaMetaTags: true,
        manifestFilename: 'manifest.json',
        useCredentialsForManifestTag: false,
        exclude: [/\.map$/, /netlify\.toml$/], // exclude netlify.toml just in case
      },
      //useCredentialsForManifestTag: false,
      manifest: {
        name: 'Q-Woo - Advanced e-commerce shop',
        short_name: 'Q-Woo',
        description: 'Headless WooCommerce SSR PWA storefront',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#005DAC',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json',
      extendManifestJson (json) {
        Object.entries(appConfig).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            json[key] = value
          }
        })
      },
      // useCredentialsForManifestTag: true,
      // injectPwaMetaTags: false,
      extendPWACustomSWConf (config) {
        config.target = 'es2022'
      },      // extendGenerateSWOptions (cfg) {},
      // extendInjectManifestOptions (cfg) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: false
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (esbuildConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: []
    }
  }
})