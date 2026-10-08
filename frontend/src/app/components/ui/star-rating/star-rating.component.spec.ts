import { TestBed } from '@angular/core/testing'
import { StarRatingComponent } from './star-rating.component'

describe('StarRatingComponent', () => {
    const setup = (value: number | null) => {
        const fixture = TestBed.createComponent(StarRatingComponent)
        fixture.componentRef.setInput('value', value)
        fixture.componentRef.setInput('label', 'Azul')
        fixture.detectChanges()
        return fixture
    }

    it('emits the 0–10 review of the star pressed', () => {
        const fixture = setup(null)
        const rated: Array<number> = []
        fixture.componentInstance.rated.subscribe((value) => rated.push(value))

        const stars = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
        expect(stars).toHaveLength(5)
        stars[3]?.click()

        expect(rated).toEqual([8])
    })

    it('marks the current review as pressed', () => {
        const fixture = setup(6)
        const pressed = fixture.nativeElement.querySelector('[aria-pressed="true"]') as HTMLButtonElement

        expect(pressed.getAttribute('aria-label')).toBe('Rate 3 out of 5 stars for Azul')
    })
})
