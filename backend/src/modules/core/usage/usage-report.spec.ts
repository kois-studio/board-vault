import { buildUsageReport, funnel, type RawUsageEvent } from './usage-report.js'

const at = (minute: number) => `2026-10-16 10:${String(minute).padStart(2, '0')}:00`
const event = (
    pseudonym: string,
    name: string,
    minute: number,
    view: string | null = null,
    fromView: string | null = null,
): RawUsageEvent => ({
    name,
    pseudonym,
    view,
    fromView,
    createdAt: at(minute),
})

describe('usage report', () => {
    const steps = [
        { label: 'Planned', events: ['session_planned'] },
        { label: 'Started', events: ['session_started'] },
        { label: 'Finished', events: ['session_finished'] },
    ]

    it('counts a step only after the steps before it, per person', () => {
        const events = [
            event('a', 'session_planned', 1),
            event('a', 'session_started', 2),
            event('a', 'session_finished', 3),
            // b started before planning: only the planning counts.
            event('b', 'session_started', 1),
            event('b', 'session_planned', 2),
            // c never planned.
            event('c', 'session_finished', 4),
        ]

        expect(funnel(events, steps)).toEqual([
            { label: 'Planned', people: 2 },
            { label: 'Started', people: 1 },
            { label: 'Finished', people: 1 },
        ])
    })

    it('ranks pages and the ways into them, and keeps actions apart from page views', () => {
        const report = buildUsageReport([
            event('a', 'page_viewed', 1, '/play'),
            event('a', 'page_viewed', 2, '/play/history', '/play'),
            event('b', 'page_viewed', 3, '/play/history', '/groups/:groupId'),
            event('b', 'page_viewed', 4, '/play/history', '/groups/:groupId'),
            event('b', 'review_saved', 5, '/games/:gameId'),
        ])

        expect(report.people).toBe(2)
        expect(report.pages[0]).toEqual({ page: '/play/history', views: 3, people: 2 })
        expect(report.paths[0]).toEqual({ from: '/groups/:groupId', page: '/play/history', count: 2 })
        expect(report.actions).toEqual([{ name: 'review_saved', events: 1, people: 1, views: [{ view: '/games/:gameId', count: 1 }] }])
        expect(report.days).toEqual([{ day: '2026-10-16', people: 2, events: 5 }])
    })
})
