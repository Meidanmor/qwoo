import { defineRouter } from '#q-app/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import routes from './routes'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: (to, from, savedPosition) => {
      // 1. If user clicked "Back" or "Forward", restore exactly where they were
      if (savedPosition) {
        return savedPosition
      }

      // 2. If we are navigating to the EXACT same path (e.g., just changing a query ?color=red)
      // do not scroll to the top.
      if (to.path === from.path) {
        return false
      }

      // 3. For all other navigations (new links), scroll to top smoothly
      // We use a Promise with a tiny timeout to ensure the new content
      // has started rendering before we move the scrollbar.
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ left: 0, top: 0, behavior: 'smooth' })
        }, 10) // 50ms is usually enough to let Vue swap the component content
      })
    },
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  // --- Start Preview Lock Logic ---
  Router.beforeEach((to, from, next) => {
    // Check if the URL has ?preview=true
    const isPreview = to.query.preview === 'true' || from.query.preview === 'true';

    if (isPreview) {
      // Allow the initial load (when there is no 'from' name or path is just root)
      if (!from.name && from.fullPath === '/') {
        return next();
      }

      // Block all other manual clicks/navigation inside the iframe
      console.warn('Navigation blocked: Iframe is in Preview Mode');
      return next(false);
    }

    next();
  });
  // --- End Preview Lock Logic ---

  return Router
})