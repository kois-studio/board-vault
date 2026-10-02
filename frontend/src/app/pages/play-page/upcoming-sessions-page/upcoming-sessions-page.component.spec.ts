import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { UpcomingSessionsPageComponent } from './upcoming-sessions-page.component'

const fridayCrew = {
    id: 7,
    name: 'Friday crew',
    createdBy: 1,
    createdAt: '2026-09-01T10:00:00.000Z',
    members: [
        { id: 1, games: [{ id: 11 }, { id: 12 }] },
        { id: 2, games: [{ id: 12 }, { id: 13 }] },
    ],
}
const sundayClub = { ...fridayCrew, id: 8, name: 'Sunday club' }

const meet = (id: number, status: string, meetDate: string) => ({ id, groupId: 7, status, meetDate, timezone: 'UTC', notes: null })

describe('UpcomingSessionsPageComponent', () => {
    const setup = async ({ groups = [fridayCrew, sundayClub], meets = [] as Array<object>, query = {} } = {}) => {
        const dataService = {
            userGroups: signal(groups),
            userGroupsError: signal(false),
            userMeets: signal(meets),
            userMeetsError: signal(false),
            refreshUserGroups: vi.fn(),
            refreshUserMeets: vi.fn(),
        }
        const loadingService = {
            loadingStatesIndex: signal({ [LOADING_KEYS.USER_GROUPS]: false, [LOADING_KEYS.USER_MEETS]: false }),
        }

        await TestBed.configureTestingModule({
            imports: [UpcomingSessionsPageComponent],
            providers: [
                // Before the ActivatedRoute override, which provideRouter would otherwise replace.
                provideRouter([]),
                { provide: DataService, useValue: dataService },
                { provide: LoadingService, useValue: loadingService },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
            ],
        }).compileComponents()

        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
        const fixture = TestBed.createComponent(UpcomingSessionsPageComponent)
        fixture.detectChanges()
        return { fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement, navigate }
    }

    it('splits sessions into waiting for results, live, and coming up', async () => {
        const { component, element } = await setup({
            meets: [
                meet(1, 'scheduled', '2099-01-02T18:00:00Z'),
                meet(2, 'scheduled', '2020-01-02T18:00:00Z'),
                meet(3, 'active', '2026-01-02T18:00:00Z'),
                meet(4, 'completed', '2020-01-01T18:00:00Z'),
                meet(5, 'cancelled', '2099-01-01T18:00:00Z'),
            ],
        })

        expect(component.sections().map((section) => [section.state, section.sessions.map((session) => session.id)])).toEqual([
            ['wrap-up', [2]],
            ['live', [3]],
            ['planned', [1]],
        ])
        expect(element.textContent).toContain('Waiting for results')
        expect(element.textContent).toContain('Record results')
    })

    it('describes a group by its people and games', async () => {
        const { component } = await setup()

        expect(component.getGroupContext(7)).toBe('2 people · 3 games')
    })

    it('goes straight to the only group when asked to plan a session', async () => {
        const { navigate, component } = await setup({ groups: [fridayCrew], query: { plan: '1' } })

        expect(navigate).toHaveBeenCalledWith(['/groups', 7, 'sessions', 'new'], { replaceUrl: true })
        expect(component.isSchedulingASession()).toBe(false)
    })

    it('asks which group to plan for when there are several', async () => {
        const { component, fixture, element } = await setup({ query: { plan: '1' } })
        fixture.detectChanges()

        expect(component.isSchedulingASession()).toBe(true)
        expect(element.textContent).toContain('Which group is it for?')
    })
})
