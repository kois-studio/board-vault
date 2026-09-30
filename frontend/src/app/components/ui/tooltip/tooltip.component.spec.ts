import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TooltipComponent } from './tooltip.component'

@Component({
    standalone: true,
    imports: [TooltipComponent],
    template: '<app-tooltip text="Keyboard help"><button type="button">Help</button></app-tooltip>',
})
class TooltipHostComponent {}

describe('TooltipComponent keyboard behavior', () => {
    let fixture: ComponentFixture<TooltipHostComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [TooltipHostComponent] }).compileComponents()
        fixture = TestBed.createComponent(TooltipHostComponent)
        fixture.detectChanges()
    })

    it('describes focused content and renders the tooltip', () => {
        const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement
        button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
        fixture.detectChanges()

        const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement
        expect(tooltip).not.toBeNull()
        expect(button.getAttribute('aria-describedby')).toBe(tooltip.id)
        expect(tooltip.textContent).toContain('Keyboard help')
    })

    it('dismisses on Escape and removes the description when focus leaves', () => {
        const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement
        button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
        fixture.detectChanges()
        button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
        fixture.detectChanges()

        expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull()
        expect(button.hasAttribute('aria-describedby')).toBe(false)
    })
})
