import { signal } from '@angular/core'
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

    it('can restore or clear the attendee context without retaining stale results', () => {
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

        component.selectAllAttendees()
        expect(selectedAttendeeIds()).toEqual([1, 2, 3])
        expect(recommendations()).toBeNull()
        expect(recommendationSignals()).toBeNull()
        expect(feedbackState()).toEqual({})
        expect(errorMessage()).toBeNull()

        component.setDecisionLens('fresh')
        expect(decisionLens()).toBe('fresh')
        expect(component.decisionLensLabel).toBe('Something new')

        component.clearAttendees()
        expect(selectedAttendeeIds()).toEqual([])
    })
})
