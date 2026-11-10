import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** Every non-test TypeScript file under `backend/src`. */
function sourceFiles(directory: string): Array<string> {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name)

        if (entry.isDirectory()) return sourceFiles(path)
        return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [path] : []
    })
}

// People are invited by username only (#277): a claim is authorised by the invitation to the
// account, and no code reads or writes the email columns 0032 cleared.
describe('retired claim email columns', () => {
    it('are neither read nor written by the backend', () => {
        const offenders = sourceFiles(resolve(__dirname, '../../..')).filter(file =>
            /claimEmail|claimExpiresAt/.test(readFileSync(file, 'utf8')),
        )

        expect(offenders).toEqual([])
    })
})
