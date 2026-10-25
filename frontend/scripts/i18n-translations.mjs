// Works on the translation files in src/locale (ADR-0024, docs/i18n.md).
//
//   node scripts/i18n-translations.mjs missing [locale]   untranslated messages, as JSON, for every language or one
//   node scripts/i18n-translations.mjs apply <file.json>  writes translations: { "<unit id>": { "es": "…", "fr": "…" } }
//   node scripts/i18n-translations.mjs check              fails when any message lacks a translation (run by the build)
//
// Angular builds a message without a <target> with its English source and only warns, so `check` is what
// keeps an untranslated message out of production. A message missing from a file altogether fails the
// build in Angular itself (`i18nMissingTranslation: error`).
// A translation keeps the source's placeholders as they are (`<ph id="0" …/>`, `{VAR_PLURAL, plural, …}`).
// Run `npm run i18n:extract` first, so every new message is in each file.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const localeDir = resolve(import.meta.dirname, '../src/locale')
const LOCALES = ['es', 'fr', 'de', 'it']
const file = (locale) => join(localeDir, `messages.${locale}.xlf`)
const unitPattern = /<unit id="([^"]+)">([\s\S]*?)<\/unit>/g

function units(xml) {
    return [...xml.matchAll(unitPattern)].map(([, id, body]) => ({
        id,
        source: body.match(/<source>([\s\S]*?)<\/source>/)?.[1] ?? '',
        target: body.match(/<target>([\s\S]*?)<\/target>/)?.[1] ?? null,
        description: body.match(/<note category="description">([\s\S]*?)<\/note>/)?.[1],
        meaning: body.match(/<note category="meaning">([\s\S]*?)<\/note>/)?.[1],
    }))
}

const placeholders = (text) => (text.match(/<ph [^>]*\/>|<pc [^>]*>|<\/pc>|\{VAR_[A-Z_0-9]+|INTERPOLATION(_\d+)?/g) ?? []).sort().join()

const [command, argument] = process.argv.slice(2)

if (command === 'missing') {
    const result = {}
    for (const locale of argument ? [argument] : LOCALES) {
        for (const unit of units(readFileSync(file(locale), 'utf8')).filter((unit) => unit.target === null)) {
            result[unit.id] ??= { source: unit.source, description: unit.description, meaning: unit.meaning, missing: [] }
            result[unit.id].missing.push(locale)
        }
    }
    console.log(JSON.stringify(result, null, 2))
} else if (command === 'check') {
    const counts = LOCALES.map((locale) => [locale, units(readFileSync(file(locale), 'utf8')).filter((unit) => unit.target === null).length])
    const missing = counts.filter(([, count]) => count > 0)
    if (missing.length) {
        console.error(
            `Untranslated messages: ${missing.map(([locale, count]) => `${locale} ${count}`).join(', ')}. ` +
                'List them with `npm run i18n:missing` and add the translations (docs/i18n.md).',
        )
        process.exit(1)
    }
} else if (command === 'apply' && argument) {
    const translations = JSON.parse(readFileSync(argument, 'utf8'))
    let problems = 0
    for (const locale of LOCALES) {
        let xml = readFileSync(file(locale), 'utf8')
        const sources = new Map(units(xml).map((unit) => [unit.id, unit.source]))
        for (const [id, byLocale] of Object.entries(translations)) {
            const text = byLocale[locale]
            if (text === undefined) continue
            if (!sources.has(id)) {
                console.error(`${locale}: no message ${id}`)
                problems++
                continue
            }
            if (placeholders(text) !== placeholders(sources.get(id))) {
                console.error(`${locale}: ${id} does not keep the source's placeholders`)
                problems++
                continue
            }
            xml = xml.replace(new RegExp(`<unit id="${id}">([\\s\\S]*?)</unit>`), (unit) =>
                unit
                    .replace(/<target>[\s\S]*?<\/target>\s*/, '')
                    .replace(/<segment[^>]*>/, '<segment state="translated">')
                    .replace(/(<\/source>)/, `$1\n        <target>${text}</target>`),
            )
        }
        writeFileSync(file(locale), xml)
    }
    process.exit(problems ? 1 : 0)
} else {
    console.error('Usage: i18n-translations.mjs missing [locale] | apply <file.json> | check')
    process.exit(2)
}
