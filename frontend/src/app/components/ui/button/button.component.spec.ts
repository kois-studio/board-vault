import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { ButtonComponent, type ButtonVariant } from './button.component'

describe('ButtonComponent', () => {
    let fixture: ComponentFixture<ButtonComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ButtonComponent],
            providers: [provideRouter([])],
        }).compileComponents()
        fixture = TestBed.createComponent(ButtonComponent)
        fixture.detectChanges()
    })

    const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement

    it('uses the shared app-btn recipe for each variant and size', () => {
        for (const variant of ['primary', 'secondary', 'danger', 'success'] satisfies Array<ButtonVariant>) {
            fixture.componentRef.setInput('variant', variant)
            fixture.detectChanges()
            expect(button().classList.contains(`app-btn-${variant}`)).toBe(true)
        }

        fixture.componentRef.setInput('size', 'small')
        fixture.detectChanges()
        expect(button().classList.contains('app-btn-sm')).toBe(true)
    })

    it('blocks clicks and keeps its label while loading', () => {
        fixture.componentRef.setInput('loading', true)
        fixture.detectChanges()

        expect(button().disabled).toBe(true)
        expect(button().getAttribute('aria-busy')).toBe('true')
    })

    it('renders a real link when it navigates', () => {
        fixture.componentRef.setInput('link', '/collection/browse')
        fixture.detectChanges()

        const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement
        expect(link.getAttribute('href')).toBe('/collection/browse')
        expect(fixture.nativeElement.querySelector('button')).toBeNull()
    })

    it('marks a disabled link as unavailable and drops its target', () => {
        fixture.componentRef.setInput('link', '/collection/browse')
        fixture.componentRef.setInput('disabled', true)
        fixture.detectChanges()

        const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement
        expect(link.getAttribute('aria-disabled')).toBe('true')
        expect(link.hasAttribute('href')).toBe(false)
    })
})
