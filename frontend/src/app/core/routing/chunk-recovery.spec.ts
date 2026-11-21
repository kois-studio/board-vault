import { DOCUMENT, Location } from '@angular/common'
import { TestBed } from '@angular/core/testing'
import { NavigationError } from '@angular/router'
import { CHUNK_RELOAD_GUARD_MS, CHUNK_RELOAD_KEY, reloadOnChunkFailure } from './chunk-recovery'

describe('reloadOnChunkFailure', () => {
    let stored: Map<string, string>
    let storageWorks: boolean
    let assign: ReturnType<typeof vi.fn>

    beforeEach(() => {
        stored = new Map()
        storageWorks = true
        assign = vi.fn()
        const sessionStorage = {
            getItem: (key: string) => {
                if (!storageWorks) throw new Error('SecurityError')
                return stored.get(key) ?? null
            },
            setItem: (key: string, value: string) => {
                if (!storageWorks) throw new Error('SecurityError')
                stored.set(key, value)
            },
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: DOCUMENT, useValue: { defaultView: { sessionStorage, location: { assign } } } },
                { provide: Location, useValue: { prepareExternalUrl: (url: string) => `/en${url}` } },
            ],
        })
    })

    const fail = (error: unknown, url = '/games/12') =>
        TestBed.runInInjectionContext(() => reloadOnChunkFailure(new NavigationError(1, url, error)))

    it.each([
        'Failed to fetch dynamically imported module: https://board-vault.com/en/chunk-D1-c9h1r.js',
        "'text/html' is not a valid JavaScript MIME type.",
        'Importing a module script failed.',
        'error loading dynamically imported module: https://board-vault.com/en/chunk-X.js',
    ])('loads the destination in full when its code is missing: %s', (message) => {
        fail(new TypeError(message))

        expect(assign).toHaveBeenCalledWith('/en/games/12')
        expect(stored.has(CHUNK_RELOAD_KEY)).toBe(true)
    })

    it('leaves any other navigation error alone', () => {
        fail(new Error('Cannot match any routes'))
        fail('a guard said no')

        expect(assign).not.toHaveBeenCalled()
    })

    it('does not reload again soon after a reload, so a broken chunk cannot loop', () => {
        stored.set(CHUNK_RELOAD_KEY, String(Date.now() - 1_000))

        fail(new TypeError('Importing a module script failed.'))

        expect(assign).not.toHaveBeenCalled()
    })

    it('reloads again once the guard has passed', () => {
        stored.set(CHUNK_RELOAD_KEY, String(Date.now() - CHUNK_RELOAD_GUARD_MS - 1))

        fail(new TypeError('Importing a module script failed.'))

        expect(assign).toHaveBeenCalledOnce()
    })

    it('never reloads without storage to remember it', () => {
        storageWorks = false

        fail(new TypeError('Importing a module script failed.'))

        expect(assign).not.toHaveBeenCalled()
    })
})
