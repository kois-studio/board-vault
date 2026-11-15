import { EMPTY, firstValueFrom, NEVER, of, Subject, throwError, toArray } from 'rxjs'
import { hasLoaded, isPending, ResourceSignal, readyState, settledValue, toResourceState } from './resource-state'

describe('ResourceSignal (#256)', () => {
    it('is loading, not empty, until the first answer', () => {
        const games = new ResourceSignal<string[]>([])

        expect(games.state()).toEqual({ status: 'loading', value: undefined })
        games.load(of(['Azul']))
        expect(games.state()).toEqual({ status: 'ready', value: ['Azul'] })
    })

    it('says an empty answer is ready with nothing in it', () => {
        const games = new ResourceSignal<string[]>(['stale'])

        games.load(of([]))
        expect(games.state()).toEqual({ status: 'ready', value: [] })
    })

    it('keeps what is shown while it reloads, and never empties it', () => {
        const games = new ResourceSignal<string[]>([])
        const answer = new Subject<string[]>()
        games.load(of(['Azul']))

        games.load(answer)
        expect(games.state()).toEqual({ status: 'refreshing', value: ['Azul'] })
        expect(games.value()).toEqual(['Azul'])

        answer.next(['Azul', 'Catan'])
        answer.complete()
        expect(games.state()).toEqual({ status: 'ready', value: ['Azul', 'Catan'] })
    })

    it('fails with nothing to show on a first load that fails', () => {
        const games = new ResourceSignal<string[]>([])
        const failed = vi.fn()

        games.load(
            throwError(() => new Error('offline')),
            { failed },
        )
        expect(games.state().status).toBe('error')
        expect(games.state().value).toBeUndefined()
        expect(failed).toHaveBeenCalledTimes(1)
    })

    it('keeps what loaded before when a reload fails', () => {
        const games = new ResourceSignal<string[]>([])
        games.load(of(['Azul']))

        games.load(throwError(() => new Error('offline')))
        expect(games.state()).toMatchObject({ status: 'error', value: ['Azul'] })
        expect(games.value()).toEqual(['Azul'])
    })

    it('clears a failure when it loads again', () => {
        const games = new ResourceSignal<string[]>([])
        games.load(throwError(() => new Error('offline')))

        games.load(NEVER)
        expect(games.state().status).toBe('loading')
        games.set(['Azul'])
        expect(games.state()).toEqual({ status: 'refreshing', value: ['Azul'] })
    })

    it('ignores an older answer that lands after a newer load started', () => {
        const games = new ResourceSignal<string[]>([])
        const older = new Subject<string[]>()
        const newer = new Subject<string[]>()

        games.load(older)
        games.load(newer)
        expect(older.observed).toBe(false)
        newer.next(['new'])
        newer.complete()
        older.next(['old'])
        expect(games.state()).toEqual({ status: 'ready', value: ['new'] })
    })

    it('passes the answer to `apply` instead of replacing the value', () => {
        const games = new ResourceSignal<string[]>([])
        games.load(of(['Azul']), { apply: (value) => games.value.set(value.map((title) => title.toUpperCase())) })

        expect(games.state()).toEqual({ status: 'ready', value: ['AZUL'] })
    })

    it('stores a quiet read as loaded and ends an earlier failure', () => {
        const games = new ResourceSignal<string[]>([])
        games.load(throwError(() => new Error('offline')))

        games.set(['Azul'])
        expect(games.state()).toEqual({ status: 'ready', value: ['Azul'] })
    })

    it('goes back to loading with its first value on reset, and stops the load on its way', () => {
        const games = new ResourceSignal<string[]>([])
        const answer = new Subject<string[]>()
        games.load(of(['Azul']))
        games.load(answer)

        games.reset()
        expect(answer.observed).toBe(false)
        expect(games.value()).toEqual([])
        expect(games.state()).toEqual({ status: 'loading', value: undefined })
    })
})

describe('ResourceSignal, loads that end oddly (#256)', () => {
    it('fails, instead of loading forever, when a load ends without an answer', () => {
        const games = new ResourceSignal<string[]>([])
        const failed = vi.fn()

        games.load(EMPTY, { failed })
        expect(games.state().status).toBe('error')
        expect(failed).toHaveBeenCalledTimes(1)
    })

    it('says nothing when a load it stopped ends', () => {
        const games = new ResourceSignal<string[]>([])
        const answer = new Subject<string[]>()
        const failed = vi.fn()
        games.load(of(['Azul']))
        games.load(answer, { failed })

        games.cancel()
        answer.complete()
        expect(games.state()).toEqual({ status: 'ready', value: ['Azul'] })
        expect(failed).not.toHaveBeenCalled()
    })
})

describe('toResourceState', () => {
    it('is loading, then ready', async () => {
        expect(await firstValueFrom(toResourceState(of(3)).pipe(toArray()))).toEqual([
            { status: 'loading', value: undefined },
            readyState(3),
        ])
    })

    it('refreshes from what was shown, and keeps it when the read fails', async () => {
        const error = new Error('offline')
        expect(
            await firstValueFrom(
                toResourceState(
                    throwError(() => error),
                    2,
                ).pipe(toArray()),
            ),
        ).toEqual([
            { status: 'refreshing', value: 2 },
            { status: 'error', value: 2, error },
        ])
    })
})

describe('reading a state', () => {
    it('knows when something has loaded, and when a value can be trusted', () => {
        const failedRefresh = { status: 'error', value: [1], error: null } as const

        expect(hasLoaded({ status: 'loading', value: undefined })).toBe(false)
        expect(hasLoaded(failedRefresh)).toBe(true)
        expect(settledValue(failedRefresh)).toBeUndefined()
        expect(settledValue({ status: 'refreshing', value: [1] })).toEqual([1])
        expect(isPending({ status: 'refreshing', value: [1] })).toBe(true)
        expect(isPending(readyState([1]))).toBe(false)
    })
})

describe('ResourceSignal quiet refresh (#263)', () => {
    afterEach(() => vi.restoreAllMocks())

    it('keeps what is shown ready while it reads again, then shows the newer copy', () => {
        const resource = new ResourceSignal<Array<number>>([])
        resource.load(of([1]))
        const later = new Subject<Array<number>>()

        resource.revalidate(later)
        expect(resource.state()).toEqual(readyState([1]))
        expect(resource.busy).toBe(true)

        later.next([1, 2])
        later.complete()
        expect(resource.state()).toEqual(readyState([1, 2]))
        expect(resource.busy).toBe(false)
    })

    it('changes nothing when the answer equals what is shown', () => {
        const resource = new ResourceSignal<Array<{ id: number }>>([])
        resource.load(of([{ id: 1 }]))
        const shown = resource.value()
        const apply = vi.fn()

        resource.revalidate(of([{ id: 1 }]), apply)

        expect(resource.value()).toBe(shown)
        expect(apply).not.toHaveBeenCalled()
    })

    it('keeps what is shown, without failing, when the read fails', () => {
        const resource = new ResourceSignal<Array<number>>([])
        resource.load(of([1]))

        resource.revalidate(throwError(() => new Error('offline')))

        expect(resource.state()).toEqual(readyState([1]))
        expect(resource.busy).toBe(false)
    })

    it('ends an earlier failure when it answers', () => {
        const resource = new ResourceSignal<Array<number>>([])
        resource.load(of([1]))
        resource.load(throwError(() => new Error('offline')))

        resource.revalidate(of([1]))

        expect(resource.state()).toEqual(readyState([1]))
    })

    it('does nothing while a load is on its way, and a load started meanwhile wins', () => {
        const resource = new ResourceSignal<Array<number>>([])
        const first = new Subject<Array<number>>()
        resource.load(first)
        const ignored = new Subject<Array<number>>()
        resource.revalidate(ignored)
        expect(ignored.observed).toBe(false)
        first.next([1])
        first.complete()

        const older = new Subject<Array<number>>()
        resource.revalidate(older)
        resource.load(of([2]))
        older.next([1])

        expect(older.observed).toBe(false)
        expect(resource.state()).toEqual(readyState([2]))
    })

    it('drops its answer when the value changed in place meanwhile, and stays due for a newer read', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1000)
        const resource = new ResourceSignal<Array<number>>([])
        resource.load(of([1, 2]))
        const older = new Subject<Array<number>>()
        resource.revalidate(older)

        // Left a group while the quiet read was on its way: its answer still has it.
        resource.value.update((items) => items.filter((item) => item !== 2))
        vi.spyOn(Date, 'now').mockReturnValue(2000)
        older.next([1, 2])
        older.complete()

        expect(resource.value()).toEqual([1])
        expect(resource.answeredAt).toBe(1000)
        expect(resource.busy).toBe(false)
    })

    it('knows when it last answered, and forgets it on reset', () => {
        vi.spyOn(Date, 'now').mockReturnValue(5000)
        const resource = new ResourceSignal<Array<number>>([])
        expect(resource.answeredAt).toBeNull()

        resource.load(of([1]))
        expect(resource.answeredAt).toBe(5000)

        resource.reset()
        expect(resource.answeredAt).toBeNull()
    })
})
