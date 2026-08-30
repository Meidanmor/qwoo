// We need to extract the 'purgecss' property from the required object
const { purgeCSSPlugin } = require('@fullhuman/postcss-purgecss');
module.exports = {
  plugins: [
    require('autoprefixer')({
      overrideBrowserslist: [
        'last 4 Chrome versions',
        'last 4 Firefox versions',
        'last 4 Edge versions',
        'last 4 Safari versions',
        'last 4 Android versions',
        'last 4 ChromeAndroid versions',
        'last 4 FirefoxAndroid versions',
        'last 4 iOS versions'
      ]
    }),

    // Now we call the extracted function
    purgeCSSPlugin({
      content: [
        './src/**/*.vue',
        './src/**/*.js',
        './index.html',
        './.quasar/**/*.js' // Important for SSR!
      ],
safelist: {
    standard: [
        'html', 'body',
        /q-app/, /q-layout/, /q-page/, /q-header/, /q-footer/,
        /q-body--/,        // Vital for drawer-open overflow handling
        /q-layout--/,      // Vital for header/drawer positioning
        // --- Drawer Fixes ---
        /q-drawer/,        // Re-added: Covers q-drawer, q-drawer--left, etc.
        'q-page-container', // Ensures page content shifts correctly
        // --- Header & Shadow Fixes ---
        'q-header--hidden',
        'q-layout__shadow',
        'absolute-full',
        'fullscreen',
        'fixed-full',
        'no-pointer-events',
        'overflow-hidden',
        'bg-black',
        'q-slider',
'q-range',
'q-range__track',
'q-range__track-container',
'q-range__thumb',
'q-range__pin',
'q-range__text',
'q-range__marker',
        // --- Positioning & Stacking ---
        'fixed-top', 'fixed-bottom', 'absolute-top', 'sticky', 'fixed', 'absolute',
        'z-top', 'z-max',

        // --- Utility Fixes ---
        'fit', 'scroll', 'no-scroll', 'hide-scrollbar',
        'row', 'column', 'flex', 'items-center', 'justify-center', 'no-wrap',
        /q-item/,           // Protects q-item, q-item-section, q-item-label
        /q-list/,
        /^q-img/,
        /q-separator/,      // If you use lines between menu items
        'q-router-link--active', // Highlights the current page in the menu
        'q-link',           // Base link styles
        /^q-loading-bar/,

        // --- Select Specifics ---
        /q-field/,
        /q-input/,
        /q-textarea/,
        /^q-option-group/,
        /^q-radio/,
        /truthy/,
        /falsy/,
        /^q-checkbox/,
        /^q-toggle/,
        /^q-focusable/,
        /^q-manual-focusable/,
        /^q-ripple/,
        'q-select',
        'q-menu',             // The popup container (Critical!)
        'q-position-engine',  // Quasar's logic for positioning the dropdown

        // --- List & Items (Inside the dropdown) ---
        'q-list',
        'q-item',
        'q-item__section',
        'q-item__label',
        'q-virtual-scroll__content', // Selects often use virtual scroll

        // --- States ---
        'q-manual-focusable',
        'q-hoverable',
        'q-focusable',
        'text-primary',      // Often used for the active item
        // ----- Carousel styles -----
        /^q-carousel/,      // Keeps all carousel structural classes
        /^q-transition/,    // Keeps all transition/animation classes
        // --- Notification System Fixes ---
        'q-notifications',      // The main container wrapper (Crucial!)
        /^q-notification/,     // Individual notification wrapper
        /^q-notify/,           // Quasar notification classes

        'q-spinner',
        'q-spinner-mat', // Or whatever spinner type you use
        /^q-transition/,  // Important for fade-in/out of the spinner
        // --- Transition/Animation Fixes ---
        // Notifications use Quasar's internal transitions to fade in/out
        'q-transition--fade',
        'q-transition--scale',
        'q-transition--slide-up',
    ],
    deep: [
        /q-btn/, /q-icon/, /q-ripple/, /q-scrollarea/, /q-layout__shadow/, /q-drawer/, /q-list/, /^q-carousel/, /q-spinner/, /q-menu/, /q-select/, /q-img/, /q-field/, /q-input/, /q-textarea/, /q-option-group/, /q-radio/, /q-checkbox/, /^q-range/, /^q-slider/, /^q-tabs/
    ],
    greedy: [ /q-transition/, /rotate/, /^q-radio/, /^q-range/]
},
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
    })
  ]
}