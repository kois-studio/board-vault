import { createClient } from '@libsql/client'

import { resolvedTitleSql } from './resolved-title.js'

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
