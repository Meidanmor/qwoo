<template>
  <section class="not-found-page">
    <div class="container not-found-inner text-center">
      <div class="not-found-code" aria-hidden="true">404</div>

      <h1>Page not found</h1>
      <p class="not-found-text">
        The page you're looking for doesn't exist, may have been moved, or the link might be broken.
      </p>

      <div class="not-found-actions">
        <q-btn
            unelevated
            color="secondary"
            text-color="primary"
            class="btn-big"
            to="/"
            label="Back to Homepage"
        />

        <q-btn
            flat
            color="transparent"
            text-color="black"
            class="btn-styled"
            to="/products"
            label="Browse Products"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { useMeta } from 'quasar'
import { useSSRContext } from 'vue'

// Static, standalone meta for this page — it isn't backed by real
// content, so it shouldn't be indexed or inherit SEO data from
// whatever route the user actually hit.
useMeta({
  title: '404 - Page Not Found',
  meta: {
    robots: { name: 'robots', content: 'noindex, nofollow', key: 'robots' }
  }
})

// The catch-all route never throws, so src-ssr/middlewares/render.js
// has no reason to send anything but 200. Set the real status here,
// during SSR, before that middleware's res.send(html) runs.
if (process.env.SERVER) {
  const ssrContext = useSSRContext()
  if (ssrContext?.res) ssrContext.res.statusCode = 404
}
</script>

<style scoped>
.not-found-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.not-found-inner {
  max-width: 520px;
}

.not-found-code {
  font-size: 140px;
  font-weight: 700;
  line-height: 1;
  color: var(--q-secondary);
  opacity: 0.12;
  user-select: none;
}

.not-found-page h1 {
  margin-top: -55px;
}

.not-found-text {
  color: var(--q-text);
  opacity: 0.7;
  margin: 12px 0 36px;
}

.not-found-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

@media (min-width: 600px) {
  .not-found-actions {
    flex-direction: row;
    justify-content: center;
    gap: 28px;
  }
}

@media (max-width: 767px) {
  .not-found-code {
    font-size: 96px;
  }

  .not-found-page h1 {
    margin-top: -32px;
  }
}
</style>