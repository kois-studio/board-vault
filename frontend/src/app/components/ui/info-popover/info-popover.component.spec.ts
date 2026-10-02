import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { InfoPopoverComponent } from './info-popover.component'

@Component({
    imports: [InfoPopoverComponent],
    template: '<app-info-popover label="About this list"><p>Explanation</p></app-info-popover><p id="outside">Outside</p>',
})
class HostComponent {}

describe('InfoPopoverComponent', () => {
    let fixture: ComponentFixture<HostComponent>
    let button: HTMLButtonElement

    const panel = () => fixture.nativeElement.querySelector('[role="region"]') as HTMLElement | null

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents()
        fixture = TestBed.createComponent(HostComponent)
        fixture.detectChanges()
        button = fixture.nativeElement.querySelector('button')
    })

    it('starts closed and opens on click', () => {
        expect(button.getAttribute('aria-label')).toBe('About this list')
        expect(button.getAttribute('aria-expanded')).toBe('false')
        expect(panel()).toBeNull()

        button.click()
        fixture.detectChanges()

        expect(button.getAttribute('aria-expanded')).toBe('true')
        expect(panel()?.textContent).toContain('Explanation')
        expect(button.getAttribute('aria-controls')).toBe(panel()?.id)
    })

    it('closes on a second click, on Escape, and on a click outside', () => {
        button.click()
        fixture.detectChanges()
        button.click()
        fixture.detectChanges()
        expect(panel()).toBeNull()

        button.click()
        fixture.detectChanges()
        button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        fixture.detectChanges()
        expect(panel()).toBeNull()

        button.click()
        fixture.detectChanges()
        fixture.nativeElement.querySelector('#outside').click()
        fixture.detectChanges()
        expect(panel()).toBeNull()
    })

    it('keeps a hover preview open when it is clicked', () => {
        const wrapper = button.parentElement as HTMLElement
        const hover = new Event('pointerenter') as PointerEvent
        Object.defineProperty(hover, 'pointerType', { value: 'mouse' })
        wrapper.dispatchEvent(hover)
        fixture.detectChanges()
        expect(panel()).not.toBeNull()

        button.click()
        const leave = new Event('pointerleave') as PointerEvent
        Object.defineProperty(leave, 'pointerType', { value: 'mouse' })
        wrapper.dispatchEvent(leave)
        fixture.detectChanges()

        expect(panel()).not.toBeNull()
    })
})
