import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SwitchComponent } from './switch.component'

@Component({
    imports: [SwitchComponent],
    template: `<span id="label">Help</span><app-switch [checked]="on()" labelledBy="label" (toggled)="on.set($event)" />`,
})
class HostComponent {
    readonly on = signal(true)
}

describe('SwitchComponent', () => {
    it('announces its state and asks for the opposite one', () => {
        const fixture = TestBed.createComponent(HostComponent)
        fixture.detectChanges()
        const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[role="switch"]')

        expect(button?.getAttribute('aria-checked')).toBe('true')
        expect(button?.getAttribute('aria-labelledby')).toBe('label')

        button?.click()
        fixture.detectChanges()

        expect(button?.getAttribute('aria-checked')).toBe('false')
    })
})
