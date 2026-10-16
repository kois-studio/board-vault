import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupActivityPageType, GroupActivityType } from '../../api/api.types'
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

    async function render(pages: Array<GroupActivityPageType | Error>) {
        getGroupActivity = vi.fn()
        for (const page of pages) getGroupActivity.mockReturnValueOnce(page instanceof Error ? throwError(() => page) : of(page))
        await TestBed.configureTestingModule({
            imports: [GroupActivityFeedComponent],
            providers: [provideRouter([]), { provide: Api, useValue: { getGroupActivity } }],
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

    it('says when there is nothing yet, and offers a retry when loading fails', async () => {
        await render([new Error('offline')])

        expect(text()).toContain('The history could not be loaded.')
    })
})
