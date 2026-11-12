import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import type { Route } from '@angular/router'
import { from, type Observable, of, Subject } from 'rxjs'
import { mergeAll } from 'rxjs/operators'
import { LoginService } from '../services/login.service'
import { SectionPreloadingStrategy, savesData } from './section-preloading'

describe('SectionPreloadingStrategy (#264)', () => {
    let connection: { saveData?: boolean; effectiveType?: string } | undefined

    beforeEach(() => {
        connection = undefined
        // The browser is idle at once; each preload still waits for its turn.
        vi.stubGlobal('requestIdleCallback', (callback: () => void) => setTimeout(callback))
        Object.defineProperty(navigator, 'connection', { configurable: true, get: () => connection })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        Reflect.deleteProperty(navigator, 'connection')
    })

    const setup = ({ signedIn = true, admin = false } = {}) => {
        const login = { isAuthenticated: signal(signedIn), isCurrentUserAdmin: signal(admin) }
        TestBed.configureTestingModule({ providers: [{ provide: LoginService, useValue: login }] })
        const strategy = TestBed.inject(SectionPreloadingStrategy)
        /** Asks to preload `path`, as the router does after a navigation; `answer` is what loading its code gives. */
        const preload = (path: string, answer: Observable<unknown> = of(null)) => {
            const load = vi.fn(() => answer)
            let done = false
            strategy.preload({ path } as Route, load).subscribe({ complete: () => (done = true) })
            return { load, done: () => done }
        }
        const settle = async () => {
            TestBed.tick()
            for (let i = 0; i < 20; i++) await new Promise((resolve) => setTimeout(resolve))
        }
        return { login, preload, settle }
    }

    it('loads the pages of Home, Collection and Play ahead', async () => {
        const { preload, settle } = setup()

        const pages = ['dashboard', 'collection', 'collection/games', 'collection/browse', 'play', 'play/history'].map((path) =>
            preload(path),
        )
        await settle()

        for (const page of pages) {
            expect(page.load).toHaveBeenCalledTimes(1)
            expect(page.done()).toBe(true)
        }
    })

    it('leaves every other page to load when it is opened', async () => {
        const { preload, settle } = setup()

        const others = ['you', 'games/:gameId', 'groups/:groupId', 'settings', 'login', '**'].map((path) => preload(path))
        await settle()

        for (const page of others) {
            expect(page.load).not.toHaveBeenCalled()
            expect(page.done()).toBe(true)
        }
    })

    it('waits until you are signed in', async () => {
        const { login, preload, settle } = setup({ signedIn: false })

        const collection = preload('collection')
        await settle()
        expect(collection.load).not.toHaveBeenCalled()

        login.isAuthenticated.set(true)
        await settle()
        expect(collection.load).toHaveBeenCalledTimes(1)
    })

    it('loads Administration ahead for admins only', async () => {
        const member = setup()
        const notForMembers = member.preload('admin')
        await member.settle()
        expect(notForMembers.load).not.toHaveBeenCalled()

        TestBed.resetTestingModule()
        const admin = setup({ admin: true })
        const forAdmins = admin.preload('admin')
        await admin.settle()
        expect(forAdmins.load).toHaveBeenCalledTimes(1)
    })

    it('loads nothing ahead when the browser asks to save data, or the connection is 2G', async () => {
        const { preload, settle } = setup()

        connection = { saveData: true }
        const saving = preload('collection')
        await settle()
        expect(saving.load).not.toHaveBeenCalled()

        connection = { effectiveType: 'slow-2g' }
        const slow = preload('play')
        await settle()
        expect(slow.load).not.toHaveBeenCalled()

        connection = { effectiveType: '4g' }
        const fast = preload('play')
        await settle()
        expect(fast.load).toHaveBeenCalledTimes(1)
    })

    it('loads one page at a time, the next once the one before has arrived or failed', async () => {
        const { preload, settle } = setup()
        const first = new Subject<unknown>()
        const second = new Subject<unknown>()

        const collection = preload('collection', first)
        const play = preload('play', second)
        const history = preload('play/history')
        await settle()
        expect(collection.load).toHaveBeenCalledTimes(1)
        expect(play.load).not.toHaveBeenCalled()

        first.error(new Error('chunk failed'))
        await settle()
        expect(play.load).toHaveBeenCalledTimes(1)
        expect(history.load).not.toHaveBeenCalled()

        second.next(null)
        second.complete()
        await settle()
        expect(history.load).toHaveBeenCalledTimes(1)
    })
})

describe('SectionPreloadingStrategy with the router’s own load (#264)', () => {
    beforeEach(() => vi.stubGlobal('requestIdleCallback', (callback: () => void) => setTimeout(callback)))
    afterEach(() => vi.unstubAllGlobals())

    /** As the router's `load()` for a page: a value at once, then the page's code once its chunk arrives. */
    const chunk = () => {
        let arrive!: () => void
        let fail!: (error: Error) => void
        const arrived = new Promise<unknown>((resolve, reject) => {
            arrive = () => resolve(class {})
            fail = reject
        })
        return { load: vi.fn(() => from([of(undefined), arrived]).pipe(mergeAll())), arrive: () => arrive(), fail: (e: Error) => fail(e) }
    }

    const setup = () => {
        const login = { isAuthenticated: signal(true), isCurrentUserAdmin: signal(false) }
        TestBed.configureTestingModule({ providers: [{ provide: LoginService, useValue: login }] })
        const strategy = TestBed.inject(SectionPreloadingStrategy)
        const settle = async () => {
            TestBed.tick()
            for (let i = 0; i < 20; i++) await new Promise((resolve) => setTimeout(resolve))
        }
        return { login, strategy, settle }
    }

    it('waits for a page’s code to arrive before loading the next', async () => {
        const { strategy, settle } = setup()
        const collection = chunk()
        const play = chunk()

        strategy.preload({ path: 'collection' }, collection.load).subscribe()
        strategy.preload({ path: 'play' }, play.load).subscribe()
        await settle()
        expect(collection.load).toHaveBeenCalledTimes(1)
        expect(play.load).not.toHaveBeenCalled()

        collection.arrive()
        await settle()
        expect(play.load).toHaveBeenCalledTimes(1)
    })

    it('goes on to the next page when a chunk fails to load', async () => {
        const { strategy, settle } = setup()
        const collection = chunk()
        const play = chunk()

        strategy.preload({ path: 'collection' }, collection.load).subscribe()
        strategy.preload({ path: 'play' }, play.load).subscribe()
        await settle()
        collection.fail(new Error('chunk failed'))
        await settle()

        expect(play.load).toHaveBeenCalledTimes(1)
    })

    it('loads nothing more once you sign out', async () => {
        const { login, strategy, settle } = setup()
        const collection = chunk()
        const play = chunk()

        strategy.preload({ path: 'collection' }, collection.load).subscribe()
        strategy.preload({ path: 'play' }, play.load).subscribe()
        await settle()
        login.isAuthenticated.set(false)
        collection.arrive()
        await settle()

        expect(play.load).not.toHaveBeenCalled()
    })
})

describe('savesData', () => {
    it('reads the browser’s data saver and the connection type', () => {
        const withConnection = (connection: object | undefined) => ({ connection }) as unknown as Navigator

        expect(savesData(withConnection(undefined))).toBe(false)
        expect(savesData(withConnection({ saveData: true }))).toBe(true)
        expect(savesData(withConnection({ effectiveType: '2g' }))).toBe(true)
        expect(savesData(withConnection({ effectiveType: 'slow-2g' }))).toBe(true)
        expect(savesData(withConnection({ effectiveType: '3g' }))).toBe(false)
    })
})
