import { RecommendationsPageComponent } from './recommendations-page.component'

describe('RecommendationsPageComponent history context', () => {
    it('labels persisted group play history honestly', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent

        expect(component.getRecommendationHistoryLabel('2026-08-16T19:30:00.000Z')).toBe('Last played by this group')
        expect(component.getRecommendationHistoryLabel(null)).toBe('Not played by this group yet')
    })
})
