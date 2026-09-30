import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { ButtonComponent } from './button.component'

describe('ButtonComponent accessibility states', () => {
    let fixture: ComponentFixture<ButtonComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ButtonComponent],
            providers: [{ provide: ActivatedRoute, useValue: {} }],
        }).compileComponents()
        fixture = TestBed.createComponent(ButtonComponent)
        fixture.detectChanges()
    })

    it('keeps every visual variant on an explicit contrast-safe recipe', () => {
        const variants: Array<{
            name: ButtonComponent['variant']
            expected: Array<string>
        }> = [
            { name: 'primary', expected: ['bg-indigo-600', 'text-white'] },
            { name: 'secondary', expected: ['bg-zinc-100', 'text-zinc-900', 'dark:bg-zinc-800', 'dark:text-zinc-100'] },
            { name: 'danger', expected: ['bg-red-500', 'text-white'] },
            { name: 'success', expected: ['bg-green-600', 'text-white'] },
        ]

        for (const variant of variants) {
            fixture.componentRef.setInput('variant', variant.name)
            fixture.detectChanges()
            const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement

            for (const className of variant.expected) {
                expect(button.classList.contains(className), `${variant.name}: ${className}; actual=${button.className}`).toBe(true)
            }
        }
    })

    it('exposes disabled and loading state to native controls', () => {
        fixture.componentRef.setInput('loading', true)
        fixture.detectChanges()

        const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement
        expect(button.disabled).toBe(true)
        expect(button.getAttribute('aria-busy')).toBe('true')
        expect(button.textContent).toContain('Working')
    })
})
