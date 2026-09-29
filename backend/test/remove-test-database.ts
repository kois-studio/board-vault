import { rmSync } from 'node:fs'

/**
 * On Windows the native libsql driver keeps the SQLite file locked until the
 * process exits, even after the client is closed. Cleanup there is best effort:
 * the file is ignored by Git and replaced by the next run's setup.
 */
export function removeTestDatabase(path: string): void {
    try {
        rmSync(path, { force: true })
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code

        if (process.platform !== 'win32' || (code !== 'EBUSY' && code !== 'EPERM')) {
            throw error
        }
    }
}
