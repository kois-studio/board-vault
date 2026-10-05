import { TestBed } from '@angular/core/testing'
import { ThemeService } from '../../../core/services/theme.service'
import { SettingsAppearanceComponent } from './settings-appearance.component'

describe('SettingsAppearanceComponent', () => {
    afterEach(() => localStorage.clear())

    function render() {
        const fixture = TestBed.createComponent(SettingsAppearanceComponent)
        fixture.detectChanges()
        return fixture
    }

    function radios(element: HTMLElement): Array<HTMLInputElement> {
        return Array.from(element.querySelectorAll<HTMLInputElement>('input[type="radio"][name="theme"]'))
    }

    it('offers System, Light and Dark as one radio group, with System chosen by default', () => {
        const fixture = render()
        const element: HTMLElement = fixture.nativeElement

        expect(element.querySelector('legend')?.textContent).toContain('Theme')
        expect(radios(element).map((radio) => radio.closest('label')?.textContent?.trim().split(/\s+/)[0])).toEqual([
            'System',
            'Light',
            'Dark',
        ])
        expect(radios(element).find((radio) => radio.checked)?.value).toBe('system')
    })

    it('saves the chosen theme', () => {
        const fixture = render()
        const dark = radios(fixture.nativeElement).find((radio) => radio.value === 'dark')

        dark?.click()
        fixture.detectChanges()

        expect(TestBed.inject(ThemeService).preference()).toBe('dark')
        expect(localStorage.getItem('theme')).toBe('dark')
        expect(radios(fixture.nativeElement).find((radio) => radio.checked)?.value).toBe('dark')
    })
})
