import { TestBed } from '@angular/core/testing'
import { ThemeService } from '../../../core/services/theme.service'
import { SettingsAppearanceComponent } from './settings-appearance.component'

describe('SettingsAppearanceComponent', () => {
    afterEach(() => {
        localStorage.clear()
        delete document.documentElement.dataset['theme']
        delete document.documentElement.dataset['textSize']
    })

    function render() {
        const fixture = TestBed.createComponent(SettingsAppearanceComponent)
        fixture.detectChanges()
        return fixture
    }

    function radios(element: HTMLElement, name: string): Array<HTMLInputElement> {
        return Array.from(element.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${name}"]`))
    }

    function labels(element: HTMLElement, name: string): Array<string | undefined> {
        // The visible name, without the aria-hidden preview (the text size samples read "Aa").
        return radios(element, name).map((radio) => {
            const label = radio.closest('label')?.cloneNode(true) as HTMLElement | undefined
            for (const preview of Array.from(label?.querySelectorAll('[aria-hidden="true"]') ?? [])) preview.remove()
            return label?.textContent?.trim().split(/\s+/)[0]
        })
    }

    function choose(fixture: ReturnType<typeof render>, name: string, value: string): void {
        radios(fixture.nativeElement, name)
            .find((radio) => radio.value === value)
            ?.click()
        fixture.detectChanges()
    }

    it('groups the color scheme, the theme and the text size, each as one radio group', () => {
        const element: HTMLElement = render().nativeElement

        expect(Array.from(element.querySelectorAll('legend')).map((legend) => legend.textContent?.trim())).toEqual([
            'Color scheme',
            'Theme',
            'Text size',
        ])
        expect(labels(element, 'scheme')).toEqual(['System', 'Light', 'Dark'])
        expect(labels(element, 'palette')).toEqual(['Ciruela', 'Felt', 'Harbor', 'Graphite'])
        expect(labels(element, 'text-size')).toEqual(['Default', 'Large', 'Larger'])
    })

    it('starts on System, Ciruela and the default size', () => {
        const element: HTMLElement = render().nativeElement

        expect(radios(element, 'scheme').find((radio) => radio.checked)?.value).toBe('system')
        expect(radios(element, 'palette').find((radio) => radio.checked)?.value).toBe('ciruela')
        expect(radios(element, 'text-size').find((radio) => radio.checked)?.value).toBe('default')
    })

    it('saves the chosen color scheme', () => {
        const fixture = render()

        choose(fixture, 'scheme', 'dark')

        expect(TestBed.inject(ThemeService).preference()).toBe('dark')
        expect(localStorage.getItem('theme')).toBe('dark')
        expect(radios(fixture.nativeElement, 'scheme').find((radio) => radio.checked)?.value).toBe('dark')
    })

    it('saves the chosen theme, and the color scheme previews wear it', () => {
        const fixture = render()

        choose(fixture, 'palette', 'felt')

        expect(TestBed.inject(ThemeService).palette()).toBe('felt')
        expect(localStorage.getItem('palette')).toBe('felt')
        const schemePreviews = fixture.nativeElement.querySelectorAll('fieldset:first-of-type [data-theme]')
        expect(Array.from<HTMLElement>(schemePreviews).map((preview) => preview.dataset['theme'])).toEqual(['felt', 'felt', 'felt', 'felt'])
    })

    it('saves the chosen text size', () => {
        const fixture = render()

        choose(fixture, 'text-size', 'larger')

        expect(TestBed.inject(ThemeService).textSize()).toBe('larger')
        expect(localStorage.getItem('text-size')).toBe('larger')
        expect(document.documentElement.dataset['textSize']).toBe('larger')
    })
})
