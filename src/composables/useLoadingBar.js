import { LoadingBar } from 'quasar'

let initialized = false

export function initLoadingBar(router) {
    if (initialized) return
    initialized = true

    LoadingBar.setDefaults({
        color: 'secondary',
        size: '5px',
        position: 'top'
    })

    router.beforeEach((to, from, next) => {
        LoadingBar.start()
        next()
    })

    router.afterEach(() => {
        LoadingBar.stop()
    })
}