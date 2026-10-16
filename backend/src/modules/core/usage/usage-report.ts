import type { UsageActionDto, UsageFunnelDto, UsageReportDto } from '../../../common/types/usage.type.js'

export type RawUsageEvent = { name: string; pseudonym: string; view: string | null; fromView: string | null; createdAt: string }

/** A funnel: steps in order, each step any of its event names (ADR-0021). */
export const FUNNELS: Array<{ name: string; steps: Array<{ label: string; events: Array<string> }> }> = [
    {
        name: 'Getting started',
        steps: [
            { label: 'Created an account', events: ['account_created'] },
            { label: 'Added a first game', events: ['game_added'] },
            { label: 'Created or joined a group', events: ['group_created', 'group_joined'] },
            { label: 'Planned or recorded a night', events: ['session_planned', 'session_recorded'] },
        ],
    },
    {
        name: 'Game night',
        steps: [
            { label: 'Planned a night', events: ['session_planned'] },
            { label: 'Started one', events: ['session_started'] },
            { label: 'Finished one', events: ['session_finished'] },
            { label: 'Rated a game', events: ['review_saved'] },
        ],
    },
]

const TOP = 30

function top<T>(items: Array<T>, by: (item: T) => number, limit = TOP): Array<T> {
    return [...items].sort((a, b) => by(b) - by(a)).slice(0, limit)
}

/** How many people went through the steps in order: each step after the time they reached the one before. */
export function funnel(events: Array<RawUsageEvent>, steps: Array<{ label: string; events: Array<string> }>): UsageFunnelDto['steps'] {
    const byPerson = new Map<string, Array<RawUsageEvent>>()

    for (const event of events) byPerson.set(event.pseudonym, [...(byPerson.get(event.pseudonym) ?? []), event])
    const reached = steps.map(() => 0)

    for (const personEvents of byPerson.values()) {
        let step = 0

        // Events come oldest first, so walking them once finds each step after the previous one.
        for (const event of personEvents) {
            if (step < steps.length && steps[step]?.events.includes(event.name)) {
                reached[step] = (reached[step] ?? 0) + 1
                step += 1
            }
        }
    }
    return steps.map((step, index) => ({ label: step.label, people: reached[index] ?? 0 }))
}

/** The report from the last 30 days of raw events, oldest first. */
export function buildUsageReport(events: Array<RawUsageEvent>): Omit<UsageReportDto, 'recording' | 'optedOut' | 'months'> {
    const days = new Map<string, { people: Set<string>; events: number }>()
    const pages = new Map<string, { views: number; people: Set<string> }>()
    const paths = new Map<string, number>()
    const actions = new Map<string, { events: number; people: Set<string>; views: Map<string | null, number> }>()

    for (const event of events) {
        const day = event.createdAt.slice(0, 10)
        const dayEntry = days.get(day) ?? { people: new Set<string>(), events: 0 }

        dayEntry.people.add(event.pseudonym)
        dayEntry.events += 1
        days.set(day, dayEntry)

        if (event.name === 'page_viewed' && event.view) {
            const page = pages.get(event.view) ?? { views: 0, people: new Set<string>() }

            page.views += 1
            page.people.add(event.pseudonym)
            pages.set(event.view, page)
            if (event.fromView) {
                const key = `${event.fromView}\n${event.view}`

                paths.set(key, (paths.get(key) ?? 0) + 1)
            }
            continue
        }

        const action = actions.get(event.name) ?? { events: 0, people: new Set<string>(), views: new Map<string | null, number>() }

        action.events += 1
        action.people.add(event.pseudonym)
        action.views.set(event.view, (action.views.get(event.view) ?? 0) + 1)
        actions.set(event.name, action)
    }

    return {
        people: new Set(events.map(event => event.pseudonym)).size,
        events: events.length,
        days: [...days].map(([day, entry]) => ({ day, people: entry.people.size, events: entry.events })),
        pages: top(
            [...pages].map(([page, entry]) => ({ page, views: entry.views, people: entry.people.size })),
            page => page.views,
        ),
        paths: top(
            [...paths].map(([key, count]) => {
                const [from = '', page = ''] = key.split('\n')

                return { from, page, count }
            }),
            path => path.count,
        ),
        actions: top(
            [...actions].map(([name, entry]): UsageActionDto => ({
                name,
                events: entry.events,
                people: entry.people.size,
                views: top(
                    [...entry.views].map(([view, count]) => ({ view, count })),
                    view => view.count,
                    5,
                ),
            })),
            action => action.events,
            50,
        ),
        funnels: FUNNELS.map(definition => ({ name: definition.name, steps: funnel(events, definition.steps) })),
    }
}
