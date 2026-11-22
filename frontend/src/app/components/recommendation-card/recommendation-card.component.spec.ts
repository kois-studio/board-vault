import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { RecommendationCardComponent } from './recommendation-card.component'

describe('RecommendationCardComponent', () => {
    let fixture: ComponentFixture<RecommendationCardComponent>

    const details = (): string =>
        (fixture.nativeElement.querySelector('p.mt-1') as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? ''

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [RecommendationCardComponent], providers: [provideRouter([])] }).compileComponents()

        fixture = TestBed.createComponent(RecommendationCardComponent)
        for (const [name, value] of Object.entries({
            title: 'Azul',
            imageUrl: '',
            minPlayers: 2,
            maxPlayers: 4,
            historyLabel: 'New to this group',
            reasons: [],
            score: 80,
        })) {
            fixture.componentRef.setInput(name, value)
        }
    })

    it('shows the length when it is known', () => {
        fixture.componentRef.setInput('minutes', 45)
        fixture.detectChanges()

        expect(details()).toBe('45 min · 2–4 players · New to this group')
    })

    it('leaves out an unknown length instead of showing 0 min', () => {
        fixture.componentRef.setInput('minutes', 0)
        fixture.detectChanges()

        expect(details()).toBe('2–4 players · New to this group')
    })
})
