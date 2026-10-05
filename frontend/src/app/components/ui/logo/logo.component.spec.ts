import { TestBed } from '@angular/core/testing'
import { LogoComponent } from './logo.component'

describe('LogoComponent', () => {
    it('is decorative unless it has a label', () => {
        const fixture = TestBed.createComponent(LogoComponent)
        fixture.componentRef.setInput('size', 24)
        fixture.detectChanges()
        const svg: SVGElement = fixture.nativeElement.querySelector('svg')

        expect(svg.getAttribute('aria-hidden')).toBe('true')
        expect(svg.getAttribute('width')).toBe('24')
        expect(svg.getAttribute('fill')).toBe('currentColor')
        expect(svg.querySelectorAll('rect')).toHaveLength(4)

        fixture.componentRef.setInput('label', 'Board Vault')
        fixture.detectChanges()

        expect(svg.getAttribute('aria-hidden')).toBeNull()
        expect(svg.getAttribute('role')).toBe('img')
        expect(svg.getAttribute('aria-label')).toBe('Board Vault')
    })
})
