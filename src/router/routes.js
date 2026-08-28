import ProductsPage from 'pages/ProductsPage.vue'
import ProductPage from 'pages/ProductPage.vue'
import CategoryPage from 'pages/CategoryPage.vue'
import CartPage from 'pages/CartPage.vue'
import CheckoutPage from 'pages/CheckoutPage.vue'

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'product/:slug', component: ProductPage },
      { path: 'product-category/:slug', component: CategoryPage },
      { path: 'cart', component: CartPage },
      {
        path: 'checkout',
        component: CheckoutPage,
      },
      { path: 'products', name: 'products', component: ProductsPage },
      { path: 'thank-you', name: 'thank-you', component: () => import('pages/ThankYouPage.vue') },
      { path: 'my-account', name: 'my-account', component: () => import('pages/AccountPage.vue') },
      { path: 'forgot-password', name: 'forgot-password', component: () => import('pages/ForgotPasswordPage.vue') },
      { path: 'reset-password', name: 'reset-password', component: () => import('pages/ResetPasswordPage.vue') },
        {
  path: '/auth/callback',
  component: () => import('pages/AuthCallback.vue'),
  meta: { public: true } // optional, if you have auth guards
},

      // Always leave this as last one,
      // but you can also remove it.
      // Nested under MainLayout so unmatched routes still get the
      // header, nav, and footer instead of a bare, dead-end page.
      { path: ':catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') }
    ]
  }
]

export default routes