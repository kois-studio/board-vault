import { of, Subject, throwError } from 'rxjs'
import type { HistoryPageOptions, HistoryPageType, HistoryRecordType } from '../../api/api.types'
import { HistoryPager } from './historyPager'

const night = (id: number) => ({ meetData: { id } }) as unknown as HistoryRecordType
const ids = (pager: HistoryPager) => pager.entries().map((record) => record.meetData.id)

describe('HistoryPager (#252)', () => {
    it('reads the first page, then the nights after the last one shown, with their own page size', () => {
        const read = vi.fn((options: HistoryPageOptions) =>
            of(options.before === undefined ? { entries: [night(9), night(8)], hasMore: true } : { entries: [night(7)], hasMore: false }),
        )
        const pager = new HistoryPager(read, 2, 20)

        expect(pager.loading()).toBe(true)

        pager.reset({ gameId: 5 })

        expect(read).toHaveBeenLastCalledWith({ gameId: 5, before: undefined, limit: 2 })
        expect(ids(pager)).toEqual([9, 8])
        expect([pager.loading(), pager.hasMore()]).toEqual([false, true])

        pager.loadMore()

        expect(read).toHaveBeenLastCalledWith({ gameId: 5, before: 8, limit: 20 })
        expect(ids(pager)).toEqual([9, 8, 7])
        expect(pager.hasMore()).toBe(false)

        pager.loadMore()

        expect(read).toHaveBeenCalledTimes(2)
    })

    it('asks for one older page at a time', () => {
        const older = new Subject<HistoryPageType>()
        const read = vi.fn((options: HistoryPageOptions) =>
            options.before === undefined ? of({ entries: [night(9)], hasMore: true }) : older,
        )
        const pager = new HistoryPager(read, 1)
        pager.reset()

        pager.loadMore()
        pager.loadMore()

        expect(read).toHaveBeenCalledTimes(2)
        expect(pager.loadingMore()).toBe(true)
    })

    it('drops a page still on its way when it starts over, so the old filter never lands in the new list', () => {
        const slow = new Subject<HistoryPageType>()
        const read = vi.fn((options: HistoryPageOptions) => (options.groupId === 1 ? slow : of({ entries: [night(3)], hasMore: false })))
        const pager = new HistoryPager(read, 10)

        pager.reset({ groupId: 1 })
        pager.reset({ groupId: 2 })
        slow.next({ entries: [night(99)], hasMore: true })

        expect(ids(pager)).toEqual([3])
        expect(pager.hasMore()).toBe(false)
    })

    it('starting over while an older page loads leaves nothing marked as loading', () => {
        const older = new Subject<HistoryPageType>()
        const read = vi.fn((options: HistoryPageOptions) =>
            options.before === undefined ? of({ entries: [night(9)], hasMore: true }) : older,
        )
        const pager = new HistoryPager(read, 1)
        pager.reset()
        pager.loadMore()

        pager.reset()

        expect([pager.loading(), pager.loadingMore()]).toEqual([false, false])
    })

    it('keeps the nights shown when an older page fails, and tries that page again', () => {
        let fail = true
        const read = vi.fn((options: HistoryPageOptions) =>
            options.before === undefined
                ? of({ entries: [night(9)], hasMore: true })
                : fail
                  ? throwError(() => new Error('offline'))
                  : of({ entries: [night(8)], hasMore: false }),
        )
        const pager = new HistoryPager(read, 1)
        pager.reset()
        pager.loadMore()

        expect([pager.moreFailed(), pager.loadingMore(), pager.failed()]).toEqual([true, false, false])
        expect(ids(pager)).toEqual([9])

        fail = false
        pager.retry()

        expect(read).toHaveBeenLastCalledWith({ before: 9, limit: 1 })
        expect(ids(pager)).toEqual([9, 8])
        expect(pager.moreFailed()).toBe(false)
    })

    it('says when the first page fails, and starts over with the same filters on retry', () => {
        let fail = true
        const read = vi.fn(() => (fail ? throwError(() => new Error('offline')) : of({ entries: [night(4)], hasMore: false })))
        const pager = new HistoryPager(read, 5)
        pager.reset({ groupId: 3 })

        expect([pager.failed(), pager.loading()]).toEqual([true, false])

        fail = false
        pager.retry()

        expect(read).toHaveBeenLastCalledWith({ groupId: 3, before: undefined, limit: 5 })
        expect(ids(pager)).toEqual([4])
        expect(pager.failed()).toBe(false)
    })
})
