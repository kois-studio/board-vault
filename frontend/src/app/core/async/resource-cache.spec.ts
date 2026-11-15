import { type DestroyRef, signal } from '@angular/core'
import { FRESH_FOR_MS, ResourceCache } from './resource-cache'
import { loadingState, type ResourceState, readyState } from './resource-state'

/** A kept read whose state, busy flag and answer time a spec sets by hand. */
function fakeRead() {
    const state = signal<ResourceState<unknown>>(loadingState())
    const read = {
        resource: { state, busy: false, answeredAt: null as number | null, cancel: vi.fn() },
        load: vi.fn(),
        revalidate: vi.fn(),
    }
    const answer = (at: number) => {
        state.set(readyState([]))
        read.resource.answeredAt = at
    }
    return { read, answer }
}

/** A page that can be closed: `destroy` runs what it asked to run on destroy. */
function fakePage() {
    const callbacks: Array<() => void> = []
    const ref = { onDestroy: (callback: () => void) => callbacks.push(callback) } as unknown as DestroyRef
    return {
        ref,
        destroy: () => {
            for (const callback of callbacks.splice(0)) callback()
        },
    }
}

describe('ResourceCache (#263)', () => {
    let now = 100_000

    beforeEach(() => {
        now = 100_000
        vi.spyOn(Date, 'now').mockImplementation(() => now)
    })

    afterEach(() => vi.restoreAllMocks())

    const setup = () => {
        const games = fakeRead()
        const groups = fakeRead()
        const cache = new ResourceCache({ games: games.read, groups: groups.read })
        return { cache, games, groups }
    }

    it('loads nothing until someone signs in, then what the open pages use', () => {
        const { cache, games, groups } = setup()
        cache.use(['games'], fakePage().ref)
        expect(games.read.load).not.toHaveBeenCalled()

        cache.start()

        expect(games.read.load).toHaveBeenCalledTimes(1)
        expect(groups.read.load).not.toHaveBeenCalled()
    })

    it('loads a key the first time a page uses it, and shares a read on its way', () => {
        const { cache, games } = setup()
        cache.start()

        cache.use(['games'], fakePage().ref)
        games.read.resource.busy = true
        cache.use(['games'], fakePage().ref)

        expect(games.read.load).toHaveBeenCalledTimes(1)
        expect(games.read.revalidate).not.toHaveBeenCalled()
    })

    it('asks nothing while an answer is fresh, and reads it again quietly after', () => {
        const { cache, games } = setup()
        cache.start()
        cache.use(['games'], fakePage().ref)
        games.answer(now)

        now += FRESH_FOR_MS - 1
        cache.use(['games'], fakePage().ref)
        expect(games.read.revalidate).not.toHaveBeenCalled()

        now += 1
        cache.use(['games'], fakePage().ref)
        expect(games.read.revalidate).toHaveBeenCalledTimes(1)
        expect(games.read.load).toHaveBeenCalledTimes(1)
    })

    it('loads again, rather than quietly, a key whose first load failed', () => {
        const { cache, games } = setup()
        cache.start()
        cache.use(['games'], fakePage().ref)
        games.read.resource.state.set({ status: 'error', value: undefined, error: new Error('offline') })

        cache.use(['games'], fakePage().ref)

        expect(games.read.load).toHaveBeenCalledTimes(2)
    })

    it('reloads on invalidate a key an open page uses, with a cheaper load when given one', () => {
        const { cache, games } = setup()
        cache.start()
        cache.use(['games'], fakePage().ref)
        const cheaper = vi.fn()

        cache.invalidate('games')
        cache.invalidate('games', cheaper)

        expect(games.read.load).toHaveBeenCalledTimes(2)
        expect(cheaper).toHaveBeenCalledTimes(1)
    })

    it('drops what is on its way for an unused key on invalidate, and reads it with the next page', () => {
        const { cache, games } = setup()
        cache.start()
        const page = fakePage()
        cache.use(['games'], page.ref)
        games.answer(now)
        page.destroy()
        expect(cache.isUsed('games')).toBe(false)

        cache.invalidate('games')
        expect(games.read.resource.cancel).toHaveBeenCalledTimes(1)
        expect(games.read.load).toHaveBeenCalledTimes(1)

        // Fresh by age, but changed since: it reloads, so the copy from before the write never passes for current.
        cache.use(['games'], fakePage().ref)
        expect(games.read.load).toHaveBeenCalledTimes(2)
        expect(games.read.revalidate).not.toHaveBeenCalled()
    })

    it('counts each page: a key stays used until the last page using it closes', () => {
        const { cache } = setup()
        const first = fakePage()
        const second = fakePage()
        cache.use(['games'], first.ref)
        cache.use(['games'], second.ref)

        first.destroy()
        expect(cache.isUsed('games')).toBe(true)
        second.destroy()
        expect(cache.isUsed('games')).toBe(false)
    })

    it('does nothing after stop', () => {
        const { cache, games } = setup()
        cache.start()
        cache.use(['games'], fakePage().ref)
        games.answer(now)
        cache.stop()

        cache.invalidate('games')
        now += FRESH_FOR_MS
        cache.use(['games'], fakePage().ref)

        expect(games.read.load).toHaveBeenCalledTimes(1)
        expect(games.read.resource.cancel).not.toHaveBeenCalled()
        expect(games.read.revalidate).not.toHaveBeenCalled()
    })
})
