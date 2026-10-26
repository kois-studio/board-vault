// Serves the production build for the Lighthouse audit like Vercel does: gzip, shared files at the root, each
// language's index.html for its own routes, and the middleware's redirect for an address without a language.
// It also serves a runtime config with a Clerk key, as production has (#92), so the audit downloads and
// runs Clerk's bundle. The key is fake: its frontend API is on `.invalid`, so Clerk's next request fails at once.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, posix, resolve, sep } from 'node:path'
import { createGzip } from 'node:zlib'

import { localeOfPath, localeRedirect } from '../src/app/core/i18n/locales.ts'

const root = resolve(process.cwd(), 'dist/frontend/browser')
const port = Number(process.env.PORT ?? 4400)
const types = {
    '.css': 'text/css',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.webmanifest': 'application/manifest+json',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
}

const runtimeConfig = `globalThis.__BOARD_VAULT_RUNTIME_CONFIG__ = ${JSON.stringify({
    clerkPublishableKey: `pk_test_${Buffer.from('clerk.board-vault.invalid$').toString('base64')}`,
    selfRegistrationEnabled: false,
    previewLocales: true,
})};\n`

if (!existsSync(join(root, 'en/index.html'))) {
    console.error(`serve-dist: no build in ${root}; run the frontend build first.`)
    process.exit(1)
}

createServer((request, response) => {
    // A URL path, so POSIX on every system: Windows' normalize() would turn /es/login into \es\login.
    const path = posix.normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname))
    if (path === '/runtime-config.js') {
        response.writeHead(200, { 'Content-Type': 'text/javascript' })
        response.end(runtimeConfig)
        return
    }
    const url = new URL(request.url ?? '/', 'http://localhost')
    const redirect = localeRedirect(url, request.headers.cookie ?? null, request.headers['accept-language'] ?? null)
    if (redirect) {
        response.writeHead(307, { Location: redirect })
        response.end()
        return
    }
    const candidate = join(root, path)
    const locale = localeOfPath(path)
    const fallback = locale ? join(root, locale, 'index.html') : null
    // Inside the build only: a decoded `%5C` is a separator on Windows, and `root` is also a prefix of `browser-x`.
    const inside = candidate.startsWith(root + sep)
    const file = inside && existsSync(candidate) && statSync(candidate).isFile() ? candidate : fallback
    if (!file) {
        response.writeHead(404)
        response.end()
        return
    }

    const type = types[extname(file)] ?? 'application/octet-stream'
    const gzip = /^(text|application)\//.test(type) && String(request.headers['accept-encoding']).includes('gzip')

    response.writeHead(200, { 'Content-Type': type, ...(gzip ? { 'Content-Encoding': 'gzip' } : {}) })
    const body = createReadStream(file)
    if (gzip) body.pipe(createGzip()).pipe(response)
    else body.pipe(response)
}).listen(port, '127.0.0.1', () => console.log(`serve-dist: listening on http://127.0.0.1:${port}`))
