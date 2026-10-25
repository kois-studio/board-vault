// After `ng build` (ADR-0024): every language is its own folder (`browser/es/`), but the files in
// `public/` are the same for all of them and the pages link them from the root (`/favicon.svg`,
// `/runtime-config.js`, `/images/…`). Move one copy of each to `browser/`, and give each language
// its own web manifest with its description.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const frontend = resolve(import.meta.dirname, '..')
const browser = join(frontend, 'dist/frontend/browser')
const publicDir = join(frontend, 'public')
const manifests = JSON.parse(readFileSync(join(frontend, 'src/locale/manifest.json'), 'utf8'))
const locales = Object.keys(manifests).filter((locale) => existsSync(join(browser, locale, 'index.html')))

if (locales.length === 0) {
    // A build without --localize (a single language at the root) has nothing to assemble.
    process.exit(0)
}

for (const name of readdirSync(publicDir)) {
    if (name === 'manifest.webmanifest') continue
    cpSync(join(publicDir, name), join(browser, name), { recursive: true })
    for (const locale of locales) {
        rmSync(join(browser, locale, name), { recursive: true, force: true })
    }
}

const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.webmanifest'), 'utf8'))
for (const locale of locales) {
    const localized = { ...manifest, lang: locale, description: manifests[locale].description }
    writeFileSync(join(browser, locale, 'manifest.webmanifest'), `${JSON.stringify(localized, null, 4)}\n`)
}

console.log(`assemble-locales: ${locales.join(', ')}; shared files at the root.`)
