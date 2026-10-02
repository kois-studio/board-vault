import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, RouterLink } from '@angular/router'
import { ButtonComponent, type ButtonSize, type ButtonVariant } from './button.component'

@Component({
    imports: [ButtonComponent, RouterLink],
    template: `
        <button appButton [variant]="variant()" [size]="size()" [type]="type()" [loading]="loading()" [disabled]="disabled()" icon="plus">Save</button>
        <a appButton variant="secondary" routerLink="/collection/browse" [disabled]="disabled()">Add games</a>
    `,
})
class HostComponent {
    readonly variant = signal<ButtonVariant>('primary')
    readonly size = signal<ButtonSize>('medium')
    readonly type = signal<'button' | 'submit'>('button')
    readonly loading = signal(false)
    readonly disabled = signal(false)
}

describe('ButtonComponent', () => {
    let fixture: ComponentFixture<HostComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [provideRouter([])],
        }).compileComponents()
        fixture = TestBed.createComponent(HostComponent)
        fixture.detectChanges()
    })

    const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement
    const link = () => fixture.nativeElement.querySelector('a') as HTMLAnchorElement

    it('styles the native element for each variant and size', () => {
        for (const variant of ['primary', 'secondary', 'danger', 'success'] satisfies Array<ButtonVariant>) {
            fixture.componentInstance.variant.set(variant)
            fixture.detectChanges()
            expect(button().classList.contains(`app-btn-${variant}`)).toBe(true)
        }

        fixture.componentInstance.size.set('small')
        fixture.detectChanges()
        expect(button().classList.contains('app-btn-sm')).toBe(true)
        expect(link().classList.contains('app-btn-secondary')).toBe(true)
    })

    it('defaults to type="button" and accepts submit', () => {
        expect(button().type).toBe('button')
        fixture.componentInstance.type.set('submit')
        fixture.detectChanges()
        expect(button().type).toBe('submit')
        expect(link().hasAttribute('type')).toBe(false)
    })

    it('renders its icon before the label', () => {
        expect(button().querySelector('app-icon')).not.toBeNull()
        expect(button().textContent?.trim()).toBe('Save')
    })

    it('blocks clicks and keeps its label while loading', () => {
        fixture.componentInstance.loading.set(true)
        fixture.detectChanges()

        expect(button().disabled).toBe(true)
        expect(button().getAttribute('aria-busy')).toBe('true')
        expect(button().textContent?.trim()).toBe('Save')
    })

    it('keeps links as real links', () => {
        expect(link().getAttribute('href')).toBe('/collection/browse')
        expect(link().hasAttribute('aria-disabled')).toBe(false)
    })

    it('marks a disabled link as unavailable and takes it out of the tab order', () => {
        fixture.componentInstance.disabled.set(true)
        fixture.detectChanges()

        expect(button().disabled).toBe(true)
        expect(link().getAttribute('aria-disabled')).toBe('true')
        expect(link().getAttribute('tabindex')).toBe('-1')
        expect(link().hasAttribute('disabled')).toBe(false)
    })
})
