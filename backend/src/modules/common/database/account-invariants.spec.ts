import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Almost every table references Account(id) ON DELETE CASCADE. Deleting an
// Account row would silently remove groups, sessions, and history, so the
// application only soft-deletes accounts.
describe('Account invariants', () => {
    const sourceFiles = (directory: string): string[] =>
        readdirSync(directory).flatMap(name => {
            const path = join(directory, name)

            if (statSync(path).isDirectory()) return sourceFiles(path)
            return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : []
        })

    it('never deletes or drops the Account table from application code', () => {
        const offenders = sourceFiles(join(__dirname, '../../..')).filter(path =>
            /DELETE\s+FROM\s+Account\b|DROP\s+TABLE\s+(IF\s+EXISTS\s+)?Account\b/i.test(readFileSync(path, 'utf8')),
        )

        expect(offenders).toEqual([])
    })
})
