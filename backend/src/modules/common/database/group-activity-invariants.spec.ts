import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// The group history is append-only (ADR-0020). The database refuses changes too; this keeps the
// application from even trying. Only deleting a whole group removes its history.
describe('GroupActivity invariants', () => {
    const sourceFiles = (directory: string): string[] =>
        readdirSync(directory).flatMap(name => {
            const path = join(directory, name)

            if (statSync(path).isDirectory()) return sourceFiles(path)
            return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : []
        })

    it('never updates or deletes history entries, except when the group itself is deleted', () => {
        const offenders = sourceFiles(join(__dirname, '../../..')).filter(
            path =>
                !path.endsWith(join('queries', 'group-lifecycle.ts')) &&
                /UPDATE\s+GroupActivity\b|DELETE\s+FROM\s+GroupActivity\b|DROP\s+TABLE\s+(IF\s+EXISTS\s+)?GroupActivity\b/i.test(
                    readFileSync(path, 'utf8'),
                ),
        )

        expect(offenders).toEqual([])
    })
})
