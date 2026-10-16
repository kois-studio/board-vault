import { SortByDatePipe } from './sortByDate.pipe'

describe('SortByDatePipe', () => {
    const items = [
        { id: 1, createdAt: '2026-10-01T10:00:00.000Z' },
        { id: 3, createdAt: '2026-10-02T10:00:00.000Z' },
        { id: 2, createdAt: '2026-10-02T10:00:00.000Z' },
    ]

    it('puts the newest first, the newest id first when dates match, and leaves the input alone', () => {
        const input = [...items]

        expect(new SortByDatePipe().transform(input).map((item) => item.id)).toEqual([3, 2, 1])
        expect(input.map((item) => item.id)).toEqual([1, 3, 2])
    })

    it('puts the oldest first with desc', () => {
        expect(new SortByDatePipe().transform([...items], 'desc').map((item) => item.id)).toEqual([1, 2, 3])
    })
})
