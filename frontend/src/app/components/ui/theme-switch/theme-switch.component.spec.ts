import { TestBed } from '@angular/core/testing'
import { ThemeService } from '../../../core/services/theme.service'
import { ThemeSwitchComponent } from './theme-switch.component'

describe('ThemeSwitchComponent', () => {
    afterEach(() => localStorage.clear())

    it('gives each instance its own radio group and applies the choice', () => {
        const first = TestBed.createComponent(ThemeSwitchComponent)
        const second = TestBed.createComponent(ThemeSwitchComponent)
        // Attached, as on a page: jsdom only fires `change` for connected radios.
        document.body.append(first.nativeElement, second.nativeElement)
        first.detectChanges()
        second.detectChanges()

        const radios = (fixture: typeof first) =>
            Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input[type="radio"]'))
        expect(radios(first)[0]?.name).not.toBe(radios(second)[0]?.name)
        expect(radios(first).map((radio) => radio.closest('label')?.textContent?.trim())).toEqual(['System', 'Light', 'Dark'])

        radios(first)[2]?.click()
        second.detectChanges()

        expect(TestBed.inject(ThemeService).preference()).toBe('dark')
        expect(radios(second)[2]?.checked).toBe(true)

        first.nativeElement.remove()
        second.nativeElement.remove()
    })
})
