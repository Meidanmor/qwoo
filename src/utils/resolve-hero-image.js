import {resolveLocalAsset} from "src/utils/server/resolve-local-resource.js";

export async function resolveHeroImageSrc(heroImageUrl, path='homepage-hero', origin='') {
    if (!heroImageUrl) return ''

    // Only attempt local-file resolution on the server — fs/path don't exist in the browser,
    // and on a client-side SPA navigation we can't check the filesystem anyway, so just
    // pass the backend URL straight through as the fallback.
    /*if (!process.env.SERVER) {
        return heroImageUrl
    }*/

    return resolveLocalAsset({
        url: heroImageUrl,
        localFolder: path,
        origin: origin
    })
}