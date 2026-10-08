import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../../api/api'
import { ToastService } from '../../../components/toast/toast.service'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { RecommendationsPageComponent } from './recommendations-page.component'

describe('RecommendationsPageComponent history context', () => {
    it('makes the selected group the decision context', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent

        expect(component.getDecisionTitle({ name: 'Friday Crew' })).toBe('What should Friday Crew play?')
        expect(component.getDecisionTitle(null)).toBe('Decide what to play')
    })

    it('labels persisted group play history honestly', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent

        expect(component.getRecommendationHistoryLabel('2026-08-16T19:30:00.000Z')).toBe('Last played by this group')
        expect(component.getRecommendationHistoryLabel(null)).toBe('Not played by this group yet')
    })

    it('uses plain-language labels for the decision lens shown with results', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent

        expect(component.getDecisionLensLabel('balanced')).toBe('Balanced')
        expect(component.getDecisionLensLabel('fresh')).toBe('Something new')
        expect(component.getDecisionLensLabel('favorite')).toBe('Group favorite')
    })

    it('keeps suggestions while people change and clears them when nobody is coming', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent
        const selectedAttendeeIds = signal([2])
        const recommendations = signal({ recommendations: [] } as never)
        const recommendationSignals = signal({ signals: [] } as never)
        const feedbackState = signal({ 42: 'interested' } as never)
        const errorMessage = signal('stale error')
        const decisionLens = signal<'balanced' | 'fresh' | 'favorite'>('balanced')
        const group = { members: [{ id: 1 }, { id: 2 }, { id: 3 }] }

        Object.assign(component, {
            selectedAttendeeIds,
            recommendations,
            recommendationSignals,
            feedbackState,
            errorMessage,
            decisionLens,
            selectedGroup: signal(group),
        })

        // Changing the people keeps the current suggestions on screen until the new ones arrive.
        component.selectAllAttendees()
        expect(selectedAttendeeIds()).toEqual([1, 2, 3])
        expect(recommendations()).not.toBeNull()
        expect(errorMessage()).toBeNull()

        component.setDecisionLens('fresh')
        expect(decisionLens()).toBe('fresh')
        expect(component.decisionLensLabel).toBe('Something new')

        // With nobody coming there is nothing to suggest.
        component.clearAttendees()
        expect(selectedAttendeeIds()).toEqual([])
        expect(recommendations()).toBeNull()
        expect(recommendationSignals()).toBeNull()
        expect(feedbackState()).toEqual({})
    })
})

describe('RecommendationsPageComponent and the next game night', () => {
    const night = (overrides: Record<string, unknown>) => ({
        id: 21,
        groupId: 7,
        createdBy: 9,
        meetDate: '2099-10-09T17:00:00.000Z',
        isConfirmed: false,
        status: 'scheduled',
        timezone: 'Europe/Madrid',
        notes: null,
        myRsvpStatus: 'pending',
        ...overrides,
    })

    const setup = (meets: Array<ReturnType<typeof night>>) => {
        const proposeSessionGame = vi.fn().mockReturnValue(of({ sessionId: 21, plannedGameIds: [42], gameVotes: [] }))
        const toast = { success: vi.fn(), error: vi.fn() }
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: Api, useValue: { proposeSessionGame } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal({ id: 1 }),
                        userGroups: signal([{ id: 7, name: 'Fridays', createdBy: 9, members: [] }]),
                        userGroupsError: signal(false),
                        userMeets: signal(meets),
                    },
                },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({}) } },
                { provide: ToastService, useValue: toast },
            ],
        })
        const component = TestBed.createComponent(RecommendationsPageComponent).componentInstance
        component.selectedGroupId.set(7)
        return { component, proposeSessionGame, toast }
    }

    it('offers the earliest planned night you are coming to, and adds the game to it', async () => {
        const { component, proposeSessionGame } = setup([
            night({ id: 22, meetDate: '2099-10-16T17:00:00.000Z' }),
            night({ id: 21 }),
            night({ id: 20, meetDate: '2099-10-02T17:00:00.000Z', myRsvpStatus: 'declined' }),
            night({ id: 19, meetDate: '2099-10-01T17:00:00.000Z', status: 'cancelled' }),
        ])

        expect(component.nextNight()?.id).toBe(21)
        expect(component.nextNightLabel()).toBe('Fri 9 Oct')

        await component.addToNextNight(42)
        expect(proposeSessionGame).toHaveBeenCalledWith(21, 42)
        expect(component.addedToNight()[42]).toBe(true)
    })

    it('has no night to offer when you are not coming to any', () => {
        const { component } = setup([night({ myRsvpStatus: 'declined' }), night({ id: 30, myRsvpStatus: null })])

        expect(component.nextNight()).toBeNull()
    })
})
