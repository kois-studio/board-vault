#!/usr/bin/env node

// Imports the reviewed Wikidata candidates (#361, ADR-0030) into a Board Vault database.
//
//   TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… node database/scripts/import-wikidata-catalogue.mjs [--apply] [--file path]
//
// Without --apply it only prints what it would change. Per candidate:
//   1. a game with the same wikidataId is that game;
//   2. else a game without a wikidataId that has an edition titled like one of the candidate's titles, or its
//      `matchTitles`, is linked: it gets the wikidataId and keeps its own data;
//   3. else a new game is inserted, with no artwork, its editions, and length 0 (unknown) when Wikidata has none.
// Existing games only gain what is empty: a length of 0 or NULL, missing player counts, editions in languages they
// lack. Titles, artwork, prices and tags an admin set are never touched. A title another game already uses is
// skipped, so search keeps one game per title. Everything is written in one batch: all of it, or nothing.
// Running it again after an import reports no changes. How to run it: docs/how-to/import-wikidata-catalogue.md.

import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const SCHEMA_VERSION = '0037'
const WIKIDATA_ID = /^Q[1-9]\d*$/

// Same as backend/src/modules/core/game-titles/normalize-title.ts; keep them in step.
export const normalizeTitle = title =>
    title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')

const isCount = value => Number.isInteger(value) && value >= 1 && value <= 100
const isEmpty = value => value === null || value === undefined || Number(value) <= 0

/** The candidate's editions: its primary title, then one per other language. */
function editionsOf(candidate) {
    return [
        { languageCode: candidate.titleLanguage, title: candidate.title.trim(), isPrimary: true },
        ...(candidate.otherTitles ?? []).map(other => ({ languageCode: other.languageCode, title: other.title.trim(), isPrimary: false })),
    ].filter(edition => edition.title)
}

/** Refuses a file that was not reviewed, or that the import could not write safely. */
export function validateCandidates(file) {
    const problems = []
    const seen = new Set()
    for (const candidate of file.candidates ?? []) {
        const name = `${candidate.wikidataId} (${candidate.title})`
        if (!WIKIDATA_ID.test(candidate.wikidataId ?? '')) problems.push(`${name}: not a Wikidata ID`)
        if (seen.has(candidate.wikidataId)) problems.push(`${name}: listed twice`)
        seen.add(candidate.wikidataId)
        if (candidate.check?.length) problems.push(`${name}: not reviewed yet (${candidate.check.join('; ')})`)
        if (!candidate.title?.trim() || !candidate.titleLanguage) problems.push(`${name}: no title`)
        if (!isCount(candidate.minPlayers) || !isCount(candidate.maxPlayers) || candidate.minPlayers > candidate.maxPlayers) {
            problems.push(`${name}: player counts ${candidate.minPlayers}–${candidate.maxPlayers}`)
        }
        if (candidate.durationMinutes !== null && !(Number.isInteger(candidate.durationMinutes) && candidate.durationMinutes >= 1 && candidate.durationMinutes <= 1440)) {
            problems.push(`${name}: length ${candidate.durationMinutes}`)
        }
        const languages = editionsOf(candidate).map(edition => edition.languageCode)
        if (new Set(languages).size !== languages.length) problems.push(`${name}: two titles in one language`)
    }
    if (!file.candidates?.length) problems.push('the file has no candidates')
    return problems
}

/**
 * What the import does, as a plan: `games` is the catalogue as read ({ id, wikidataId, imageUrl, gameAvgDuration,
 * minPlayers, maxPlayers, editions: [{ languageCode, title, normalizedTitle, isPrimary }] }). Pure, so it is tested
 * without a database. `firstNewId` numbers the inserted games.
 */
export function planImport(candidates, games, firstNewId) {
    const byWikidataId = new Map(games.filter(game => game.wikidataId).map(game => [game.wikidataId, game]))
    // Which games each normalized title belongs to; inserts and new editions claim theirs as the plan goes.
    const owners = new Map()
    const claim = (normalized, gameId) => owners.set(normalized, new Set([...(owners.get(normalized) ?? []), gameId]))
    for (const game of games) for (const edition of game.editions) claim(edition.normalizedTitle, game.id)
    const takenByOther = (normalized, gameId) => [...(owners.get(normalized) ?? [])].some(owner => owner !== gameId)

    // A candidate's other title never takes another candidate's own: Tribulation is "Trio" in French, and Trio is a game.
    const primaries = new Map(candidates.map(candidate => [normalizeTitle(candidate.title), candidate.wikidataId]))
    const otherCandidates = (edition, candidate) => !edition.isPrimary && primaries.has(edition.normalizedTitle) && primaries.get(edition.normalizedTitle) !== candidate.wikidataId

    const plan = { inserts: [], links: [], updates: [], unchanged: [], skipped: [] }
    // Games this run links, so a second candidate with one of their titles does not link the same game.
    const linkedNow = new Map()
    let nextId = firstNewId

    for (const candidate of candidates) {
        const editions = editionsOf(candidate)
            .map(edition => ({ ...edition, normalizedTitle: normalizeTitle(edition.title) }))
            .filter(edition => !otherCandidates(edition, candidate))
        let game = byWikidataId.get(candidate.wikidataId)
        let linked = false

        if (!game) {
            // `matchTitles` (from the review file) only find a game, as Clue finds Cluedo; they are never written.
            const titles = [...editions.map(edition => edition.normalizedTitle), ...(candidate.matchTitles ?? []).map(normalizeTitle)]
            const matches = new Set(titles.flatMap(title => [...(owners.get(title) ?? [])]))
            if ([...matches].some(id => id >= firstNewId)) {
                plan.skipped.push({ candidate, reason: 'a title is also another candidate’s' })
                continue
            }
            const matchedGames = games.filter(existing => matches.has(existing.id))
            if (matchedGames.length > 1) {
                plan.skipped.push({ candidate, reason: `titles match ${matchedGames.length} games (${matchedGames.map(match => match.id).join(', ')})` })
                continue
            }
            if (matchedGames.length === 1) {
                const linkedTo = matchedGames[0].wikidataId ?? linkedNow.get(matchedGames[0].id)
                if (linkedTo) {
                    plan.skipped.push({ candidate, reason: `title matches game ${matchedGames[0].id}, already linked to ${linkedTo}` })
                    continue
                }
                game = matchedGames[0]
                linked = true
                linkedNow.set(game.id, candidate.wikidataId)
            }
        }

        if (!game) {
            if (editions.some(edition => !edition.normalizedTitle)) {
                plan.skipped.push({ candidate, reason: 'a title is only punctuation' })
                continue
            }
            const id = nextId++
            const kept = editions.filter(edition => edition.isPrimary || !takenByOther(edition.normalizedTitle, id))
            for (const edition of kept) claim(edition.normalizedTitle, id)
            plan.inserts.push({
                candidate,
                game: {
                    id,
                    wikidataId: candidate.wikidataId,
                    gameAvgDuration: candidate.durationMinutes ?? 0,
                    minPlayers: candidate.minPlayers,
                    maxPlayers: candidate.maxPlayers,
                },
                editions: kept,
                droppedTitles: editions.filter(edition => !kept.includes(edition)).map(edition => `${edition.languageCode}: ${edition.title}`),
            })
            continue
        }

        // Only what is empty; player counts only as a pair, so min never ends up above max.
        const fields = {}
        if (isEmpty(game.gameAvgDuration) && candidate.durationMinutes) fields.gameAvgDuration = candidate.durationMinutes
        if (isEmpty(game.minPlayers) && isEmpty(game.maxPlayers)) {
            fields.minPlayers = candidate.minPlayers
            fields.maxPlayers = candidate.maxPlayers
        } else if (isEmpty(game.minPlayers) && candidate.minPlayers <= game.maxPlayers) {
            fields.minPlayers = candidate.minPlayers
        } else if (isEmpty(game.maxPlayers) && candidate.maxPlayers >= game.minPlayers) {
            fields.maxPlayers = candidate.maxPlayers
        }
        const languages = new Set(game.editions.map(edition => edition.languageCode.toLowerCase()))
        const newEditions = editions
            .filter(edition => !languages.has(edition.languageCode.toLowerCase()) && edition.normalizedTitle && !takenByOther(edition.normalizedTitle, game.id))
            .map(edition => ({ ...edition, isPrimary: false }))
        for (const edition of newEditions) claim(edition.normalizedTitle, game.id)

        const change = { candidate, gameId: game.id, fields, editions: newEditions }
        if (linked) plan.links.push(change)
        else if (Object.keys(fields).length || newEditions.length) plan.updates.push(change)
        else plan.unchanged.push(change)
    }
    return plan
}

/** The plan as SQL statements, for one batch. */
export function planStatements(plan) {
    const statements = []
    const addEditions = (gameId, editions) => {
        for (const edition of editions) {
            statements.push({
                sql: 'INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES (?, ?, ?, ?, ?)',
                args: [gameId, edition.languageCode, edition.title, edition.normalizedTitle, edition.isPrimary ? 1 : 0],
            })
        }
    }
    for (const { game, editions } of plan.inserts) {
        statements.push({
            sql: "INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers, wikidataId) VALUES (?, '', ?, ?, ?, ?)",
            args: [game.id, game.gameAvgDuration, game.minPlayers, game.maxPlayers, game.wikidataId],
        })
        addEditions(game.id, editions)
    }
    for (const [index, change] of [...plan.links, ...plan.updates].entries()) {
        const linking = index < plan.links.length
        const columns = Object.keys(change.fields)
        const sets = [...(linking ? ['wikidataId = ?'] : []), ...columns.map(column => `${column} = ?`)]
        if (sets.length) {
            statements.push({
                // The WHERE repeats what was read, so a field an admin filled meanwhile is not overwritten.
                sql: `UPDATE Game SET ${sets.join(', ')} WHERE id = ?${linking ? ' AND wikidataId IS NULL' : ''}${columns
                    .map(column => ` AND COALESCE(${column}, 0) <= 0`)
                    .join('')}`,
                args: [...(linking ? [change.candidate.wikidataId] : []), ...columns.map(column => change.fields[column]), change.gameId],
            })
        }
        addEditions(change.gameId, change.editions)
    }
    return statements
}

const describe = change =>
    [
        ...Object.entries(change.fields).map(([field, value]) => `${field}=${value}`),
        ...change.editions.map(edition => `+${edition.languageCode} "${edition.title}"`),
    ].join(', ') || 'nothing to fill'

async function readCatalogue(client) {
    const [games, editions] = await Promise.all([
        client.execute('SELECT id, wikidataId, imageUrl, gameAvgDuration, minPlayers, maxPlayers FROM Game ORDER BY id'),
        client.execute('SELECT gameId, languageCode, title, normalizedTitle, isPrimary FROM GameEdition ORDER BY gameId, id'),
    ])
    const byGame = new Map(
        games.rows.map(row => [
            Number(row.id),
            {
                id: Number(row.id),
                wikidataId: row.wikidataId === null ? null : String(row.wikidataId),
                imageUrl: String(row.imageUrl),
                gameAvgDuration: row.gameAvgDuration === null ? null : Number(row.gameAvgDuration),
                minPlayers: row.minPlayers === null ? null : Number(row.minPlayers),
                maxPlayers: row.maxPlayers === null ? null : Number(row.maxPlayers),
                editions: [],
            },
        ]),
    )
    for (const row of editions.rows) {
        byGame.get(Number(row.gameId))?.editions.push({
            languageCode: String(row.languageCode),
            title: String(row.title),
            normalizedTitle: String(row.normalizedTitle),
            isPrimary: Number(row.isPrimary) === 1,
        })
    }
    return [...byGame.values()]
}

async function main() {
    const { values } = parseArgs({
        options: {
            apply: { type: 'boolean', default: false },
            file: { type: 'string', default: resolve(dirname(fileURLToPath(import.meta.url)), '../catalogue/wikidata-candidates.json') },
        },
    })
    const databaseUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN
    if (!databaseUrl) throw new Error('TURSO_DATABASE_URL (or DATABASE_URL) is required.')

    const file = JSON.parse(await readFile(values.file, 'utf8'))
    const problems = validateCandidates(file)
    if (problems.length) {
        throw new Error(`The candidate file cannot be imported:\n- ${problems.join('\n- ')}\nFix it through wikidata-review.json and regenerate it.`)
    }

    const requireFromBackend = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '../../backend/package.json'))
    const { createClient } = requireFromBackend('@libsql/client')
    const client = createClient({ url: databaseUrl, ...(authToken ? { authToken } : {}) })

    try {
        const version = (await client.execute('SELECT MAX(version) AS version FROM SchemaMigrations')).rows[0]?.version
        if (String(version) !== SCHEMA_VERSION) throw new Error(`The database is at schema ${version}; this import needs ${SCHEMA_VERSION}.`)

        const games = await readCatalogue(client)
        const sequence = (await client.execute("SELECT seq FROM sqlite_sequence WHERE name = 'Game'")).rows[0]?.seq
        const firstNewId = Math.max(Number(sequence ?? 0), ...games.map(game => game.id), 0) + 1
        const plan = planImport(file.candidates, games, firstNewId)

        for (const { candidate, game, editions, droppedTitles } of plan.inserts) {
            const dropped = droppedTitles.length ? ` (left out, used by another game: ${droppedTitles.join(', ')})` : ''
            console.log(`insert  ${candidate.wikidataId} "${candidate.title}" as game ${game.id}, ${editions.length} editions${dropped}`)
        }
        for (const change of plan.links) console.log(`link    ${change.candidate.wikidataId} "${change.candidate.title}" to game ${change.gameId}: ${describe(change)}`)
        for (const change of plan.updates) console.log(`fill    ${change.candidate.wikidataId} "${change.candidate.title}" in game ${change.gameId}: ${describe(change)}`)
        for (const { candidate, reason } of plan.skipped) console.log(`skip    ${candidate.wikidataId} "${candidate.title}": ${reason}`)

        const statements = planStatements(plan)
        console.log(
            `\n${plan.inserts.length} to insert, ${plan.links.length} to link, ${plan.updates.length} to fill, ${plan.unchanged.length} unchanged, ${plan.skipped.length} skipped; ${statements.length} statements.`,
        )
        if (!values.apply) {
            console.log('Dry run: nothing was written. Run again with --apply to write it.')
            return
        }
        if (!statements.length) {
            console.log('No changes.')
            return
        }
        await client.batch(statements, 'write')
        console.log('Written.')
    } finally {
        client.close()
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await main()
}
