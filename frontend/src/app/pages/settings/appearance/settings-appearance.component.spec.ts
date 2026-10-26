import { TestBed } from '@angular/core/testing'
import { AccountLanguageService } from '../../../core/i18n/account-language.service'
import { ThemeService } from '../../../core/services/theme.service'
import { SettingsAppearanceComponent } from './settings-appearance.component'

describe('SettingsAppearanceComponent', () => {
    const originalPath = window.location.pathname

    afterEach(() => {
        window.history.replaceState(null, '', originalPath)
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

    describe('language', () => {
        const save = vi.fn()

        function renderAt(path: string) {
            window.history.replaceState(null, '', path)
            TestBed.configureTestingModule({ providers: [{ provide: AccountLanguageService, useValue: { choose: save } }] })
            return render()
        }

        afterEach(() => save.mockClear())

        it('has no language fieldset when the page has nothing to choose, as on a development server', () => {
            const element: HTMLElement = renderAt('/dashboard').nativeElement

            expect(radios(element, 'language')).toEqual([])
            expect(element.querySelector('legend')?.textContent?.trim()).toBe('Color scheme')
        })

        it('leads with the language, listing the header’s languages by their own names with the page’s checked', () => {
            const element: HTMLElement = renderAt('/fr/settings/appearance').nativeElement

            expect(Array.from(element.querySelectorAll('legend')).map((legend) => legend.textContent?.trim())).toEqual([
                'Language',
                'Color scheme',
                'Theme',
                'Text size',
            ])
            expect(radios(element, 'language').map((radio) => [radio.value, radio.closest('label')?.textContent?.trim()])).toEqual([
                ['en', 'English'],
                ['fr', 'Français'],
            ])
            expect(radios(element, 'language').find((radio) => radio.checked)?.value).toBe('fr')
            expect(radios(element, 'language')[1]?.closest('label')?.querySelector('[lang="fr"]')).not.toBeNull()
        })

        it('saves a chosen language through the account language service', () => {
            const fixture = renderAt('/fr/settings/appearance')

            choose(fixture, 'language', 'en')

            expect(save).toHaveBeenCalledWith('en')
        })
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
        const schemePreviews = fixture.nativeElement.querySelectorAll('fieldset:has(input[name="scheme"]) [data-theme]')
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
