# QWoo
<img width="500" height="284" alt="qwoo-screenshot" src="https://github.com/user-attachments/assets/df46021c-1773-49b3-9a88-079371c9743c" />

A headless WooCommerce storefront built with **Quasar** and **Vue** — designed to give developers a modern, fully customizable frontend while keeping WordPress and WooCommerce as the backend.

QWoo pairs with the **qwoo-core** WordPress plugin, which connects your WooCommerce store to this frontend via the WooCommerce Store API and a set of custom REST endpoints.

**Live demo:** [qwoo.vercel.app](https://qwoo.vercel.app)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Installation](#installation)
    - [1. Setup WordPress](#1-setup-wordpress)
    - [2. Setup the Frontend](#2-setup-the-frontend)
    - [3. Local HTTPS Certificates](#3-local-https-certificates)
    - [4. Environment Variables](#4-environment-variables)
- [Development](#development)
- [Build for Production](#build-for-production)
- [Project Structure](#project-structure)
- [Configuring QWoo Core](#configuring-qwoo-core)
    - [CORS & Frontend Domain](#cors--frontend-domain)
    - [Push Notifications](#push-notifications)
    - [Google Login](#google-login)
    - [GitHub Integration (Shop Builder & Offline support)](#github-integration-shop-builder)
- [Backend API (qwoo-core)](#backend-api-qwoo-core)
- [Frontend Routes (Vercel)](#frontend-routes-vercel)

## Features

- **Headless WooCommerce storefront** — full control over the frontend while WooCommerce stays your source of truth for products, orders, and customers
- **Server-Side Rendering (SSR)** — fast first paint and search-engine-friendly pages
- **Progressive Web App (PWA)** — installable, works offline, and supports web push notifications
- **Native WooCommerce session handling** — cart and checkout stay in sync with your WooCommerce backend
- **Built-in SEO** — per-page titles, meta descriptions, Open Graph tags, and JSON-LD product schema, injected server-side (Yoast-aware)
- **Google login** alongside native WordPress username/password login
- **Wishlist & order history** for logged-in customers
- **Stripe integration** for payments
- **Dynamic sitemap & robots.txt & llms.txt** generated from your live product catalog

## Roadmap

- [ ] Native mobile apps for Android and iOS using Capacitor
- [ ] Expanded native push notification support

## Tech Stack

- [Quasar Framework](https://quasar.dev/) (Vue 3, `@quasar/app-vite`)
- Server-Side Rendering via Quasar's SSR mode
- [Stripe](https://stripe.com/) for payments
- Deployed as serverless functions on [Vercel](https://vercel.com/)
- Backend powered by the **qwoo-core** WordPress/WooCommerce plugin

## Requirements

Before setting up QWoo, make sure you have:

- A WordPress installation
- WooCommerce installed and configured
- The **qwoo-core** WordPress plugin ([download](https://github.com/Meidanmor/qwoo-core/releases))
- Node.js (see `engines` in `package.json` for supported versions)

## Quick Start

1. Install and activate ([**qwoo-core**](https://github.com/Meidanmor/qwoo-core/releases)) on your WordPress/WooCommerce site.
2. In **WP Admin → Q-Woo Settings → Technical Settings**, set your Frontend Domain (see [CORS & Frontend Domain](#cors--frontend-domain)).
3. Deploy QWoo:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Meidanmor/qwoo)

4. Once deployed, set the Frontend Domain in step 2 to your live Vercel URL, and configure the required [environment variables](#4-environment-variables) in your Vercel project settings — including `PROXY_SHARED_SECRET`, copied from **Technical Settings → Frontend Proxy Secret** in the plugin.

## Installation

### 1. Setup WordPress

1. Install WooCommerce and configure your store.
2. [Download](https://github.com/Meidanmor/qwoo-core/releases) and install the **qwoo-core** WordPress plugin.
3. Head to [Configuring QWoo Core](#configuring-qwoo-core) below to set up CORS, push notifications, Google login, and GitHub integration.

### 2. Setup the Frontend

```bash
git clone <repository-url>
cd <repository-folder>
npm install
```

### 3. Local HTTPS Certificates

The dev server runs over HTTPS and expects a certificate/key pair at:

```
certs/localhost.pem
certs/localhost-key.pem
```

Generate one locally with [mkcert](https://github.com/FiloSottile/mkcert):

```bash
mkcert -install
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost
```

### 4. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description                                                                                                                                                                                                                                                                        |
|---|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `WP_BACKEND_URL` | Your WordPress/WooCommerce site's URL. The SSR server proxies `wp-json` and Store API requests here.                                                                                                                                                                               |
| `VITE_VAPID_APP_PUBLIC_KEY` | Public VAPID key for web push notifications — generated in **Technical Settings → Push Notifications**.                                                                                                                                                                            |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable (public) key, used by the checkout's payment element.                                                                                                                                                                                                      |
| `VITE_GOOGLE_WEB_CLIENT_ID` | Google OAuth Web Client ID, used for "Sign in with Google".                                                                                                                                                                                                                        |
| `PROXY_SHARED_SECRET` | Copied from **Technical Settings → Frontend Proxy Secret** in the plugin (see below). **Required if `WP_BACKEND_URL` is set** — the SSR server will refuse to start without it, rather than silently sending unauthenticated requests to your backend.                            |

`VITE_`-prefixed variables are bundled into the client-side JavaScript and are visible to anyone — only put public/publishable values there. `WP_BACKEND_URL` and `PROXY_SHARED_SECRET` are server-only and never reach the browser.

## Development

Run the dev server in **SSR mode** (recommended — this is how QWoo runs in production):

```bash
npx quasar dev -m ssr

## OR

npm run dev
```

## Build for Production

```bash
npx quasar build -m ssr

## OR

npm run build
```

## Project Structure

```
├── api/               # Vercel serverless functions (SSR handler, sitemap, robots.txt, llms.txt)
├── certs/              # Local HTTPS certificates (not committed)
├── public/
│   ├── config/          # Store branding, header, home & checkout config (JSON, synced from qwoo-core)
│   └── data/             # Offline/fetch-failure fallback data (products, categories, price meta), synced from qwoo-core
├── src/
│   ├── components/        # Vue components
│   ├── composables/       # Reusable composition-API logic (cart, auth, product archive, SEO, etc.)
│   ├── layouts/           # Page layouts
│   ├── pages/             # Route-level pages
│   ├── payments/          # Stripe integration
│   ├── router/            # Vue Router config
│   ├── stores/            # State management
│   └── utils/             # Shared helpers (config loader, formatters, hero image resolver)
├── src-pwa/            # PWA service worker & manifest
├── src-ssr/             # SSR entry point & middleware (SEO injection, CSP headers)
└── vercel.json          # Vercel routing configuration
```

## Configuring QWoo Core

All of the settings below live in **WP Admin → Q-Woo Settings → Technical Settings**. Any value can also be hardcoded as a constant in `wp-config.php` (e.g. `GOOGLE_CLIENT_ID`) — if defined there, it always takes precedence over the value saved in the settings page.

### CORS & Frontend Domain

This tells your WordPress REST API which frontend is allowed to talk to it, and is required for authenticated requests (login, cart, wishlist, etc.) to work.

1. Set **Frontend Domain** to your deployed frontend URL (no trailing slash) — e.g. your Vercel deployment URL.
2. Optionally enable **Allow localhost**, and set the port your local dev server runs on, so requests from your local machine aren't blocked while developing.
3. Copy the **Frontend Proxy Secret** shown on this page and set it as the `PROXY_SHARED_SECRET` environment variable on the frontend — required for the frontend's proxy requests to be authenticated by the plugin.

Saving this takes effect immediately — the plugin applies matching `Access-Control-Allow-Origin` headers in PHP on every REST request, so it works the same regardless of your host's server software (Apache, Nginx, LiteSpeed) or `.htaccess` file permissions.

### Push Notifications

QWoo supports web push notifications (via VAPID) for cart reminders and updates.

1. In **Technical Settings → Push Notifications**, click **⚡ Generate VAPID Keys** to generate and save a new VAPID key pair automatically — no CLI or extra tooling needed. (Generating a new pair replaces any existing keys, so already-subscribed devices will need to re-subscribe.)
2. Set a **Notification Sender Email** (used as the VAPID subject) — defaults to your WordPress admin email if left blank.
3. On the frontend, set `VITE_VAPID_APP_PUBLIC_KEY` in your `.env` to the public key shown on that same settings page.

### Google Login

1. In the [Google Cloud Console](https://console.cloud.google.com/), create OAuth 2.0 credentials (Web application type) for your project.
2. Add your frontend URL as an authorized origin and redirect URI.
3. In **Technical Settings → Google OAuth**, enter:
    - **Client ID**
    - **Client Secret**
    - **Redirect URI**
4. The frontend can then authenticate users via either:
    - `POST /qwoo/v1/google-login` — pass a Google ID token directly (One Tap / Google Identity Services), or
    - `POST /qwoo/v1/google-login-redirect` — pass an OAuth authorization code, which the backend exchanges for tokens server-side.

New users are created automatically on first Google sign-in.

### GitHub Integration (Shop Builder)

The **Shop Builder** screen (Header / Homepage / Checkout / Branding tabs) lets store admins edit the frontend's content and push it straight to this repository as JSON — no redeploy needed for content changes.

1. In **Technical Settings → GitHub Integration**, enter:
    - **Repository Owner**
    - **Repository Name**
    - **GitHub Token** (needs write access to the repo)
2. In **Q-Woo Settings → Shop Builder**, make your content changes, click **Save Draft**, then **Push to Live Website**.

This commits updated JSON to `public/config/*.json` (and synced images to `public/branding/` / `public/homepage-hero/`) in this repository.

> **Note on `public/data/*.json` (products, categories, price meta):** These files are the **offline / fetch-failure fallback & main source for the sitemap generation** the frontend serves from when the live WooCommerce Store API is unreachable (see `src/stores/products.js`). They're only committed to this repo when `qwoo-core` pushes to GitHub — which currently happens automatically whenever a product is created, updated, or deleted, but **not** when a category is added or changed, and not on any fixed schedule. If your catalog changes without a matching product save (e.g. category-only edits), these files can go stale and offline users may see outdated products or categories until the next sync. Use the **Sync Data Now** button in **Technical Settings → GitHub Integration** to push a fresh copy of all three files on demand.

## Backend API (qwoo-core)

These endpoints are registered by the **qwoo-core** plugin and served from your WordPress site at `https://<your-wordpress-site>/wp-json/...`. Requests from your frontend domain require the [CORS setup](#cors--frontend-domain) above.

### Auth

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/qwoo/v1/nonce` | GET | — | Returns a WordPress REST nonce for the current session |
| `/qwoo/v1/login` | POST | — | Logs in with username/password, sets the WordPress auth cookie |
| `/qwoo/v1/logout` | POST | ✅ | Logs out the current session |
| `/qwoo/v1/me` | GET | ✅ | Returns the current logged-in user's profile |
| `/qwoo/v1/me` | POST | ✅ | Updates the current user's first/last name |
| `/qwoo/v1/google-login` | POST | — | Signs in (or registers) a user from a Google ID token |
| `/qwoo/v1/google-login-redirect` | POST | — | Exchanges a Google OAuth code for tokens, then completes sign-in |

### SEO & Pricing

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/qwoo/v1/seo?path=` | GET | — | Returns SEO metadata (title, description, canonical, robots, OG image) for a given frontend path — pulls from Yoast when available |
| `/qwoo/v1/products-meta?category=` | GET | — | Returns min/max product price ranges, globally, per category, or for a specific list of categories — used to power price filter sliders |

### Orders & Wishlist

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/qwoo/v1/my-orders` | GET | ✅ | Returns the logged-in customer's orders (completed / processing / on-hold) with line items |
| `/qwoo/v1/wishlist/` | GET | ✅ | Returns the logged-in user's wishlist with full product data |
| `/qwoo/v1/wishlist/` | POST | ✅ | Adds or removes a product from the wishlist (`product_id`) |

### Push Notifications

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/qwoo/v1/pwa/save-subscription` | POST | — | Saves or updates a device's push subscription |
| `/qwoo/v1/pwa/remove-subscription` | POST | — | Removes a push subscription by endpoint or device ID |
| `/qwoo/v1/pwa/update-cart-token` | POST | — | Updates the cart token linked to a device's push subscription |

### Misc

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/qwoo/v1/contact-options`        | GET    | —    | Returns the store's enabled contact methods (used to conditionally show contact options on the frontend)                                    |
| `/qwoo/v1/export-products`        | GET    | —    | Returns the full product catalog as JSON — powers the GitHub sync of `public/data/products.json`                                            |
| `/shop-builder/v1/preview/{page}` | GET    | —    | Returns the current draft config for a Shop Builder tab (`header`, `home`, `checkout`, `branding`), used by the admin's live preview iframe |

## Frontend Routes (Vercel)

Alongside the SSR-rendered storefront, QWoo ships a few custom routes in `api/`, deployed as Vercel serverless functions and wired up via `vercel.json`:

| Route            | Source           | Method | Purpose                                                                               |
|------------------|------------------|---|---------------------------------------------------------------------------------------|
| `/robots.txt`    | `api/robots.js`  | GET | Serves `robots.txt`, pointing crawlers to the sitemap                                 |
| `/llms.txt`     | `api/llms.js`    | GET | Provides an LLM-readable overview of the store, including core pages, categories, and products |
| `/sitemap.xml`   | `api/sitemap.js` | GET | Generates an XML sitemap dynamically from cached product data, plus core static pages |
| `/*` (catch-all) | `api/server.js`  | GET | Routes all remaining requests to the built SSR handler for server-rendered pages      |

On every SSR request, `src-ssr/middlewares/render.js` also injects per-page SEO metadata (title, meta description, Open Graph tags, JSON-LD product schema) and a Content-Security-Policy header.

## Contributing

Contributions are welcome! bug reports, fixes, and feature suggestions are all appreciated.

### Getting Started

1. Fork the repository and clone your fork locally.
2. Follow the [Installation](#installation) steps above to get a working local environment.
3. Create a branch for your change:
   ```bash
   git checkout -b fix/short-description
   ```
4. Make your changes, following the code style already used in the project (see [Code Style](#code-style) below).
5. Test your changes locally with `npm run dev` before opening a PR.
6. Commit with a clear, descriptive message and push your branch.
7. Open a pull request against `main`, describing what changed and why.

### Code Style

- Run the linter before committing:
  ```bash
  npm run lint
  ```
- Format your code:
  ```bash
  npm run format
  ```
- Keep changes focused — separate unrelated fixes into separate PRs where possible.
- Match the existing patterns in the codebase (composables for reusable logic, Pinia-style stores, etc.) rather than introducing new conventions.

### Reporting Bugs

When filing an issue, please include:
- Steps to reproduce
- Expected vs. actual behavior
- Browser/device and Node version, if relevant
- Screenshots or console errors, if applicable

### Suggesting Features

Open an issue describing the use case before submitting a large PR, so the approach can be discussed first — this saves rework if the direction needs adjusting.

### Pull Request Guidelines

- Reference any related issue in your PR description.
- Keep PRs reasonably small and scoped to one change.
- Be responsive to review feedback — PRs that go stale without updates may be closed.

## License

This project is licensed under the [MIT License](./LICENSE).
