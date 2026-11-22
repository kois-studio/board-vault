#!/usr/bin/env node

// Picks catalogue candidates from Wikidata (#360, ADR-0030) and writes them to
// database/catalogue/wikidata-candidates.json for review in a pull request.
// Reads only the public Wikidata Query Service; never a Board Vault database.
//
//   node database/scripts/wikidata-candidates.mjs [--limit 400] [--out path] [--review path]
//
// Review decisions live in database/catalogue/wikidata-review.json, so a rerun
// keeps them: `exclude` maps an item to why it is left out, `override` maps an
// item to the fields that replace Wikidata's (title, titleLanguage, otherTitles,
// minPlayers, maxPlayers, durationMinutes, and matchTitles: other names the import finds an existing game by,
// never written as titles). Candidates that need a look carry
// `check`, a list of reasons.
//
// Wikidata data is CC0. The file holds no personal details.

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const USER_AGENT = 'BoardVaultCatalogue/1.0 (https://board-vault.com; catalogue seeding, ADR-0030)'
const LANGUAGES = ['en', 'es', 'fr', 'de', 'it']
const FIRST_YEAR = 1900
// Wikipedia languages plus 10 per award; below this a game is too little known to seed.
const MIN_SCORE = 4
// Games older than this need a household name (MIN_CLASSIC_SCORE): Monopoly, yes; a 1970s wargame, no.
const MODERN_YEAR = 1980
const MIN_CLASSIC_SCORE = 10

// Classes whose items are not a game someone keeps on a shelf as its own entry.
const EXCLUDED_CLASSES = new Set([
    'Q60474521', // board game expansion
    'Q734698', // collectible card game
    'Q299191', // chess variant
    'Q985834', // shogi variant
    'Q267989', // mancala
    'Q1643932', // tabletop role-playing game
])

// Minutes per unit of a Wikidata duration (P2047).
const MINUTES_PER_UNIT = {
    Q7727: 1, // minute
    Q25235: 60, // hour
    Q11574: 1 / 60, // second
}

const QUERY = `
SELECT ?g ?links ?year ?min ?max ?amount ?unit
       (GROUP_CONCAT(DISTINCT STRAFTER(STR(?cls), "entity/"); separator=" ") AS ?classes)
       (GROUP_CONCAT(DISTINCT STRAFTER(STR(?award), "entity/"); separator=" ") AS ?awards)
WHERE {
  ?g wdt:P2339 [] ; wdt:P31 ?cls ; wikibase:sitelinks ?links .
  OPTIONAL { ?g wdt:P577 ?date . BIND(YEAR(?date) AS ?year) }
  OPTIONAL { ?g wdt:P1872 ?min }
  OPTIONAL { ?g wdt:P1873 ?max }
  OPTIONAL { ?g p:P2047/psv:P2047 [ wikibase:quantityAmount ?amount ; wikibase:quantityUnit ?unitItem ] .
             BIND(STRAFTER(STR(?unitItem), "entity/") AS ?unit) }
  OPTIONAL {
    ?g wdt:P166 ?award .
    # Wargame awards lift niche 1970s titles nobody looking for a game night owns.
    FILTER NOT EXISTS {
      ?award rdfs:label ?awardLabel .
      FILTER(LANG(?awardLabel) = "en" && (STRSTARTS(?awardLabel, "Charles S. Roberts") || STRSTARTS(?awardLabel, "Origins Award")))
    }
  }
}
GROUP BY ?g ?links ?year ?min ?max ?amount ?unit
`

const labelsQuery = ids => `
SELECT ?g ?lang ?label WHERE {
  VALUES ?g { ${ids.map(id => `wd:${id}`).join(' ')} }
  ?g rdfs:label ?label .
  BIND(LANG(?label) AS ?lang)
  FILTER(?lang IN (${LANGUAGES.map(language => `"${language}"`).join(', ')}))
}
`

async function sparql(query) {
    for (let attempt = 1; ; attempt++) {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                Accept: 'application/sparql-results+json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': USER_AGENT,
            },
            body: new URLSearchParams({ query }),
        })
        if (response.ok) {
            return (await response.json()).results.bindings
        }
        if (attempt >= 3 || ![429, 500, 502, 503, 504].includes(response.status)) {
            throw new Error(`Wikidata Query Service answered ${response.status}: ${(await response.text()).slice(0, 300)}`)
        }
        const retryAfter = Number(response.headers.get('retry-after')) || 10 * attempt
        await new Promise(resolveWait => setTimeout(resolveWait, retryAfter * 1000))
    }
}

const entityId = uri => uri.slice(uri.lastIndexOf('/') + 1)
const words = value => (value ? value.split(' ').filter(Boolean) : [])

/** Folds the query's rows, one per value combination, into one record per item. */
export function collectItems(rows) {
    const items = new Map()
    for (const row of rows) {
        const id = entityId(row.g.value)
        const item = items.get(id) ?? {
            id,
            links: Number(row.links.value),
            years: new Set(),
            mins: new Set(),
            maxes: new Set(),
            minutes: new Set(),
            classes: new Set(),
            awards: new Set(),
        }
        if (row.year) item.years.add(Number(row.year.value))
        if (row.min) item.mins.add(Number(row.min.value))
        if (row.max) item.maxes.add(Number(row.max.value))
        const perUnit = row.unit ? MINUTES_PER_UNIT[row.unit.value] : undefined
        if (row.amount && perUnit) item.minutes.add(Math.round(Number(row.amount.value) * perUnit))
        for (const value of words(row.classes?.value)) item.classes.add(value)
        for (const value of words(row.awards?.value)) item.awards.add(value)
        items.set(id, item)
    }
    return [...items.values()]
}

const isCount = value => Number.isInteger(value) && value >= 1 && value <= 100

/** Keeps modern published games with usable player counts, and ranks them. */
export function rank(items) {
    return items
        .map(item => {
            const year = item.years.size ? Math.min(...item.years) : null
            const minPlayers = item.mins.size ? Math.min(...item.mins) : null
            const maxPlayers = item.maxes.size ? Math.max(...item.maxes) : minPlayers
            const minutes = [...item.minutes].filter(value => value >= 5 && value <= 1440)
            return {
                ...item,
                year,
                minPlayers,
                maxPlayers,
                durationMinutes: minutes.length ? Math.max(...minutes) : null,
                score: item.links + 10 * item.awards.size,
            }
        })
        .filter(
            item =>
                item.score >= (item.year !== null && item.year < MODERN_YEAR ? MIN_CLASSIC_SCORE : MIN_SCORE) &&
                item.year !== null &&
                item.year >= FIRST_YEAR &&
                isCount(item.minPlayers) &&
                isCount(item.maxPlayers) &&
                item.minPlayers <= item.maxPlayers &&
                ![...item.classes].some(value => EXCLUDED_CLASSES.has(value)),
        )
        .sort((left, right) => right.score - left.score || Number(left.id.slice(1)) - Number(right.id.slice(1)))
}

/** The record written to the file: the primary title, then only titles that differ from it. */
export function toCandidate(item, labels) {
    const titles = labels.get(item.id) ?? {}
    const primaryLanguage = LANGUAGES.find(language => titles[language])
    if (!primaryLanguage) return null
    const title = titles[primaryLanguage]
    const otherTitles = LANGUAGES.filter(language => language !== primaryLanguage && titles[language] && titles[language] !== title).map(languageCode => ({
        languageCode,
        title: titles[languageCode],
    }))
    return {
        wikidataId: item.id,
        title,
        titleLanguage: primaryLanguage,
        otherTitles,
        minPlayers: item.minPlayers,
        maxPlayers: item.maxPlayers,
        durationMinutes: item.durationMinutes,
        year: item.year,
        awards: item.awards.size,
        sitelinks: item.links,
    }
}

// Same as backend/src/modules/core/game-titles/normalize-title.ts; keep them in step.
const normalizeTitle = title =>
    title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')

/** Applies the review file, then marks what still needs a look. */
export function review(candidates, decisions) {
    const exclude = decisions.exclude ?? {}
    const override = decisions.override ?? {}
    const kept = candidates.filter(candidate => !(candidate.wikidataId in exclude)).map(candidate => ({ ...candidate, ...override[candidate.wikidataId] }))
    const byTitle = new Map()
    for (const candidate of kept) {
        const key = normalizeTitle(candidate.title)
        byTitle.set(key, (byTitle.get(key) ?? 0) + 1)
    }
    return kept.map(candidate => {
        if (candidate.wikidataId in override) return candidate
        const check = []
        if (byTitle.get(normalizeTitle(candidate.title)) > 1) check.push('another candidate has the same title')
        if (candidate.titleLanguage !== 'en') check.push('no English title')
        if (candidate.maxPlayers > 20) check.push('more than 20 players')
        if (candidate.minPlayers === candidate.maxPlayers && candidate.minPlayers > 2) check.push('one exact player count')
        if (/\(|edition\b/i.test(candidate.title)) check.push('title may name an edition or a disambiguation')
        return check.length ? { ...candidate, check } : candidate
    })
}

async function main() {
    const { values } = parseArgs({
        options: {
            limit: { type: 'string', default: '400' },
            out: { type: 'string', default: resolve(dirname(fileURLToPath(import.meta.url)), '../catalogue/wikidata-candidates.json') },
            review: { type: 'string', default: resolve(dirname(fileURLToPath(import.meta.url)), '../catalogue/wikidata-review.json') },
        },
    })
    const limit = Number(values.limit)
    if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer.')

    const ranked = rank(collectItems(await sparql(QUERY)))
    // A few extra, since items without a label in our languages are dropped below.
    const picked = ranked.slice(0, Math.ceil(limit * 1.1))

    const labels = new Map()
    for (let index = 0; index < picked.length; index += 200) {
        const batch = picked.slice(index, index + 200).map(item => item.id)
        for (const row of await sparql(labelsQuery(batch))) {
            const id = entityId(row.g.value)
            labels.set(id, { ...labels.get(id), [row.lang.value]: row.label.value.trim() })
        }
        await new Promise(resolveWait => setTimeout(resolveWait, 1000))
    }

    const decisions = JSON.parse(await readFile(values.review, 'utf8'))
    const candidates = review(
        picked
            .map(item => toCandidate(item, labels))
            .filter(Boolean)
            .slice(0, limit),
        decisions,
    )
    const file = {
        source: 'Wikidata (https://www.wikidata.org), CC0 1.0. Picked by database/scripts/wikidata-candidates.mjs, ADR-0030.',
        rule: `Items with a BoardGameGeek ID, a publication year from ${FIRST_YEAR}, and player counts; no expansions or variants. Score: Wikipedia languages plus 10 per award (not counting wargame awards), at least ${MIN_SCORE} (${MIN_CLASSIC_SCORE} before ${MODERN_YEAR}); highest first.`,
        count: candidates.length,
        excluded: Object.keys(decisions.exclude ?? {}).length,
        candidates,
    }
    await writeFile(values.out, `${JSON.stringify(file, null, 2)}\n`)
    console.log(`Wrote ${candidates.length} candidates (of ${ranked.length} eligible) to ${values.out}.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await main()
}
