import { signal } from '@angular/core'
import { RecommendationsPageComponent } from './recommendations-page.component'

describe('RecommendationsPageComponent history context', () => {
    it('labels persisted group play history honestly', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent

        expect(component.getRecommendationHistoryLabel('2026-08-16T19:30:00.000Z')).toBe('Last played by this group')
        expect(component.getRecommendationHistoryLabel(null)).toBe('Not played by this group yet')
    })

    it('can restore or clear the attendee context without retaining stale results', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent
        const selectedAttendeeIds = signal([2])
        const recommendations = signal({ recommendations: [] } as never)
        const recommendationSignals = signal({ signals: [] } as never)
        const feedbackState = signal({ 42: 'interested' } as never)
        const errorMessage = signal('stale error')
        const group = { members: [{ id: 1 }, { id: 2 }, { id: 3 }] }

        Object.assign(component, {
            selectedAttendeeIds,
            recommendations,
            recommendationSignals,
            feedbackState,
            errorMessage,
            selectedGroup: signal(group),
        })

        component.selectAllAttendees()
        expect(selectedAttendeeIds()).toEqual([1, 2, 3])
        expect(recommendations()).toBeNull()
        expect(recommendationSignals()).toBeNull()
        expect(feedbackState()).toEqual({})
        expect(errorMessage()).toBeNull()

        component.clearAttendees()
        expect(selectedAttendeeIds()).toEqual([])
    })
})
