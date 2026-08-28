export async function resolveLocalAsset({
                                            url,
                                            localFolder,
                                            fallback = url,
                                            origin = ''
                                        }) {
    //console.log(url)
    if (!url) return ''

    // Client always uses remote URL
    /*if (!process.env.SERVER) {
        return fallback
    }*/

    const filename = getFilename(url)

    if (!filename) {
        return fallback
    }

    const localPath = `/${localFolder}/${filename}`

    if (process.env.SERVER && import.meta.env.DEV) {
        return await checkDevFile(localFolder, filename)
            ? localPath
            : fallback
    }

    return await checkRemoteFile(localPath, origin)
        ? localPath
        : fallback
}


function getFilename(url) {
    try {
        return new URL(url).pathname.split('/').pop()
    } catch {
        return null
    }
}


async function checkDevFile(folder, filename) {
    const fs = await import('fs')
    const path = await import('path')

    const filePath = path.join(
        process.cwd(),
        'public',
        folder,
        filename
    )

    return fs.existsSync(filePath)
}


async function checkRemoteFile(pathname, origin='') {
    try {
        const res = await fetch(
            `${origin}${pathname}`,
            { method: 'HEAD' }
        )

        return res.ok
    } catch {
        return false
    }
}

export async function readAsset(asset, origin='') {
    if (asset.type === 'local') {

        if (import.meta.env.DEV) {
            const fs = await import('fs')
            const path = await import('path')

            const filePath = path.join(
                process.cwd(),
                'public',
                asset.path
            )

            return fs.readFileSync(filePath)
        }

        const res = await fetch(
            `${origin}${asset.path}`
        )

        return Buffer.from(
            await res.arrayBuffer()
        )
    }

    const res = await fetch(asset.path)

    return Buffer.from(
        await res.arrayBuffer()
    )
}