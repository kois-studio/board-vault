// Serves the production build for the Lighthouse audit like Vercel does: gzip, and index.html for app routes.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { createGzip } from 'node:zlib'

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

if (!existsSync(join(root, 'index.html'))) {
    console.error(`serve-dist: no build in ${root}; run the frontend build first.`)
    process.exit(1)
}

createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname))
    const candidate = join(root, path)
    const file = candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(root, 'index.html')

    const type = types[extname(file)] ?? 'application/octet-stream'
    const gzip = /^(text|application)\//.test(type) && String(request.headers['accept-encoding']).includes('gzip')

    response.writeHead(200, { 'Content-Type': type, ...(gzip ? { 'Content-Encoding': 'gzip' } : {}) })
    const body = createReadStream(file)
    if (gzip) body.pipe(createGzip()).pipe(response)
    else body.pipe(response)
}).listen(port, '127.0.0.1', () => console.log(`serve-dist: listening on http://127.0.0.1:${port}`))
