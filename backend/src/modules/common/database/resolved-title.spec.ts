import { createClient } from '@libsql/client'

import { ownedTitleSql, resolvedTitleSql } from './resolved-title.js'

describe('resolvedTitleSql', () => {
    async function resolve(locale: string, editions: Array<[string, string, number]>) {
        const client = createClient({ url: ':memory:' })

        await client.execute('CREATE TABLE Game (id INTEGER PRIMARY KEY)')
        await client.execute(
            'CREATE TABLE GameEdition (gameId INTEGER, languageCode TEXT, title TEXT, normalizedTitle TEXT, isPrimary INTEGER DEFAULT 0)',
        )
        await client.execute('INSERT INTO Game (id) VALUES (1)')
        for (const [language, title, primary] of editions) {
            await client.execute({
                sql: 'INSERT INTO GameEdition VALUES (1, ?, ?, lower(?), ?)',
                args: [language, title, title, primary],
            })
        }
        const resolved = resolvedTitleSql('g.id', locale)
        const result = await client.execute(`SELECT ${resolved.title} AS title, ${resolved.language} AS language FROM Game g`)

        return { title: result.rows[0]?.['title'], language: result.rows[0]?.['language'] }
    }

    it("prefers the reader's edition, then the primary one", async () => {
        const editions: Array<[string, string, number]> = [
            ['en', 'Codenames', 1],
            ['es', 'Código Secreto', 0],
        ]

        await expect(resolve('es', editions)).resolves.toEqual({ title: 'Código Secreto', language: 'es' })
        await expect(resolve('fr', editions)).resolves.toEqual({ title: 'Codenames', language: 'en' })
    })

    it('shows a game with only another language its one edition', async () => {
        await expect(resolve('en', [['de', 'Die Siedler', 1]])).resolves.toEqual({ title: 'Die Siedler', language: 'de' })
    })

    it('falls back to English for a language it does not support instead of writing it into the SQL', () => {
        expect(resolvedTitleSql('g.id', "x'; DROP TABLE Game; --").title).not.toContain('DROP')
    })
})

describe('ownedTitleSql', () => {
    /** Two games with an English (primary) and a Spanish edition; one copy per `editionId` given. */
    async function shelf(locale: string, copies: Array<number | null>) {
        const client = createClient({ url: ':memory:' })

        await client.execute('CREATE TABLE Game (id INTEGER PRIMARY KEY)')
        await client.execute(
            'CREATE TABLE GameEdition (id INTEGER PRIMARY KEY, gameId INTEGER, languageCode TEXT, title TEXT, normalizedTitle TEXT, isPrimary INTEGER DEFAULT 0)',
        )
        await client.execute('CREATE TABLE OwnedGame (accountId INTEGER, gameId INTEGER, editionId INTEGER)')
        await client.execute('INSERT INTO Game (id) VALUES (1), (2)')
        await client.execute(`INSERT INTO GameEdition VALUES
            (1, 1, 'en', 'Codenames', 'codenames', 1), (2, 1, 'es', 'Código Secreto', 'codigo secreto', 0),
            (3, 2, 'en', 'Citadels', 'citadels', 1), (4, 2, 'es', 'Ciudadelas', 'ciudadelas', 0)`)
        for (const [index, edition] of copies.entries()) {
            await client.execute({ sql: 'INSERT INTO OwnedGame VALUES (1, ?, ?)', args: [index + 1, edition] })
        }
        const owned = ownedTitleSql('og', 'og.gameId', locale)
        const result = await client.execute(
            `SELECT ${owned.title} AS title, ${owned.language} AS language, ${owned.normalizedTitle} AS normalized FROM OwnedGame og ORDER BY og.gameId`,
        )

        return result.rows.map(row => [row['title'], row['language'], row['normalized']])
    }

    it('uses the edition the copy is, whatever the reader’s language', async () => {
        await expect(shelf('es', [1, 4])).resolves.toEqual([
            ['Codenames', 'en', 'codenames'],
            ['Ciudadelas', 'es', 'ciudadelas'],
        ])
    })

    it('falls back to the reader’s edition, then the primary one, when the owner did not say', async () => {
        await expect(shelf('es', [null, null])).resolves.toEqual([
            ['Código Secreto', 'es', 'codigo secreto'],
            ['Ciudadelas', 'es', 'ciudadelas'],
        ])
        await expect(shelf('fr', [null, null])).resolves.toEqual([
            ['Codenames', 'en', 'codenames'],
            ['Citadels', 'en', 'citadels'],
        ])
    })

    it('ignores an edition of another game', async () => {
        await expect(shelf('en', [4, null])).resolves.toEqual([
            ['Codenames', 'en', 'codenames'],
            ['Citadels', 'en', 'citadels'],
        ])
    })
})
