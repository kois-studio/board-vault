import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupActivityPageType, GroupActivityType, GroupPersonTakeoverType } from '../../api/api.types'
import { GroupActivityFeedComponent } from './group-activity-feed.component'

const entry = (id: number, overrides: Partial<GroupActivityType> = {}): GroupActivityType => ({
    id,
    type: 'member_joined',
    createdAt: '2026-10-16 18:00:00',
    actor: { id: 3, name: 'Rita', standing: 'member' },
    meetId: null,
    person: null,
    game: null,
    subject: null,
    data: {},
    accounts: [],
    people: [],
    games: [],
    ...overrides,
})

describe('GroupActivityFeedComponent', () => {
    let fixture: ComponentFixture<GroupActivityFeedComponent>
    let getGroupActivity: ReturnType<typeof vi.fn>
    let getGroupPersonTakeovers: ReturnType<typeof vi.fn>

    async function render(pages: Array<GroupActivityPageType | Error>, takeovers: Array<GroupPersonTakeoverType> = []) {
        getGroupActivity = vi.fn()
        getGroupPersonTakeovers = vi.fn().mockReturnValue(of(takeovers))
        for (const page of pages) getGroupActivity.mockReturnValueOnce(page instanceof Error ? throwError(() => page) : of(page))
        await TestBed.configureTestingModule({
            imports: [GroupActivityFeedComponent],
            providers: [provideRouter([]), { provide: Api, useValue: { getGroupActivity, getGroupPersonTakeovers } }],
        }).compileComponents()
        fixture = TestBed.createComponent(GroupActivityFeedComponent)
        fixture.componentRef.setInput('groupId', 10)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()
    }

    const text = () => (fixture.nativeElement as HTMLElement).textContent ?? ''

    it('lists what changed, with a link to the night when there is one', async () => {
        await render([{ entries: [entry(2, { type: 'session_started', meetId: 31 }), entry(1)], hasMore: false }])

        expect(getGroupActivity).toHaveBeenCalledWith(10, { before: undefined, limit: 10 })
        expect(text()).toContain('Rita started a game night')
        expect(text()).toContain('Rita joined the group')
        const link = (fixture.nativeElement as HTMLElement).querySelector('a')
        expect(link?.getAttribute('href')).toBe('/sessions/31')
        expect(text()).not.toContain('Show older changes')
    })

    it('loads older changes after the last one shown', async () => {
        await render([
            { entries: [entry(9)], hasMore: true },
            { entries: [entry(4, { actor: { id: 5, name: 'Ana', standing: 'left' } })], hasMore: false },
        ])

        ;(fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.click()
        await fixture.whenStable()
        fixture.detectChanges()

        expect(getGroupActivity).toHaveBeenLastCalledWith(10, { before: 9, limit: 10 })
        expect(text()).toContain('Ana (left) joined the group')
    })

    it('links a takeover that can still be undone to the member who took over, where the undo is (ADR-0027)', async () => {
        // Rita (account 3) took Carlos over: the person has her name now.
        const carlos = { id: 12, name: 'Rita', standing: 'member' as const, accountId: 3 }
        await render(
            [
                {
                    entries: [
                        entry(3, { type: 'person_claimed', person: carlos, createdAt: '2026-11-10 10:00:00' }),
                        // An older takeover of the same person, undone since: no link.
                        entry(2, { type: 'person_claimed', person: carlos, createdAt: '2026-11-01 10:00:00' }),
                    ],
                    hasMore: false,
                },
            ],
            [
                {
                    groupPersonId: 12,
                    accountId: 3,
                    previousName: 'Carlos',
                    takenAt: '2026-11-10 10:00:00',
                    undoableUntil: '2026-12-10 10:00:00',
                },
            ],
        )

        const links = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="history-undo-takeover"]')
        expect(links).toHaveLength(1)
        // A member's page is found by their account: their person id would read as "not in this group".
        expect(links[0]?.getAttribute('href')).toBe('/groups/10/members/3')
        const lines = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li p:first-child')].map((line) =>
            line.textContent?.trim(),
        )
        // The open takeover still knows the name the group used; the older one only that it was Rita's history.
        expect(lines[0]).toContain('Rita took over Carlos')
        expect(lines[1]).toBe('Rita took over the history the group had recorded for them')
    })

    it('names the person as they are now once a takeover of them was undone', async () => {
        await render([
            {
                entries: [
                    entry(4, {
                        type: 'person_claimed',
                        actor: { id: 5, name: 'Leo', standing: 'member' },
                        person: { id: 12, name: 'Carlos', standing: 'member', accountId: null },
                    }),
                ],
                hasMore: false,
            },
        ])

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Leo linked Carlos to their account')
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="history-undo-takeover"]')).toBeNull()
    })

    it('says who gave a person back after a takeover', async () => {
        await render([
            {
                entries: [
                    entry(5, {
                        type: 'person_takeover_undone',
                        person: { id: 12, name: 'Carlos', standing: 'member', accountId: null },
                        subject: { id: 4, name: 'Ana', standing: 'member' },
                    }),
                    entry(4, {
                        type: 'person_takeover_undone',
                        actor: { id: 4, name: 'Ana', standing: 'member' },
                        person: { id: 13, name: 'Dana', standing: 'member', accountId: null },
                        subject: { id: 4, name: 'Ana', standing: 'member' },
                    }),
                ],
                hasMore: false,
            },
        ])

        expect(text()).toContain('Rita gave Carlos back to the group; Ana stays as themselves')
        expect(text()).toContain('Ana said they aren’t Dana and gave them back to the group')
    })

    it('says when there is nothing yet, and offers a retry when loading fails', async () => {
        await render([new Error('offline')])

        expect(text()).toContain('The history could not be loaded.')
    })

    it('holds the place of the first changes in their size while they load, never saying nothing changed (#260)', async () => {
        const page = new Subject<GroupActivityPageType>()
        getGroupActivity = vi.fn().mockReturnValue(page)
        getGroupPersonTakeovers = vi.fn().mockReturnValue(of([]))
        await TestBed.configureTestingModule({
            imports: [GroupActivityFeedComponent],
            providers: [provideRouter([]), { provide: Api, useValue: { getGroupActivity, getGroupPersonTakeovers } }],
        }).compileComponents()
        fixture = TestBed.createComponent(GroupActivityFeedComponent)
        fixture.componentRef.setInput('groupId', 10)
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement

        expect(element.querySelector('[data-testid="history-skeleton"]')).not.toBeNull()
        expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading the history…')
        expect(text()).not.toContain('Nothing has changed yet')

        page.next({ entries: [entry(1)], hasMore: false })
        page.complete()
        await fixture.whenStable()
        fixture.detectChanges()
        expect(element.querySelector('[data-testid="history-skeleton"]')).toBeNull()
        expect(element.querySelectorAll('ol li')).toHaveLength(1)
    })
})
