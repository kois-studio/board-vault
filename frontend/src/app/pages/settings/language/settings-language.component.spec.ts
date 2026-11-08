import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { AccountLanguageService, type LanguageSaveFailure } from '../../../core/i18n/account-language.service'
import type { Locale } from '../../../core/i18n/locales'
import { SettingsLanguageComponent } from './settings-language.component'

describe('SettingsLanguageComponent', () => {
    const originalPath = window.location.pathname
    const save = vi.fn()
    const saving = signal<Locale | null>(null)
    const failure = signal<LanguageSaveFailure | null>(null)
    const dismissFailure = vi.fn()

    afterEach(() => {
        window.history.replaceState(null, '', originalPath)
        save.mockReset()
        dismissFailure.mockClear()
        saving.set(null)
        failure.set(null)
    })

    function renderAt(path: string) {
        window.history.replaceState(null, '', path)
        TestBed.configureTestingModule({
            providers: [
                { provide: AccountLanguageService, useValue: { choose: save, saving, failure, dismissFailure, switchForNow: vi.fn() } },
            ],
        })
        const fixture = TestBed.createComponent(SettingsLanguageComponent)
        fixture.detectChanges()
        return fixture
    }

    function radios(element: HTMLElement): Array<HTMLInputElement> {
        return Array.from(element.querySelectorAll<HTMLInputElement>('input[type="radio"][name="language"]'))
    }

    it('has nothing to choose when the page has no language prefix, as on a development server', () => {
        const element: HTMLElement = renderAt('/settings/language').nativeElement

        expect(radios(element)).toEqual([])
    })

    it('lists the header’s languages by their own names, in one named group, with the page’s checked', () => {
        const element: HTMLElement = renderAt('/fr/settings/language').nativeElement

        expect(element.querySelector('fieldset legend')?.textContent?.trim()).toBe('Language')
        expect(radios(element).map((radio) => [radio.value, radio.closest('label')?.textContent?.trim()])).toEqual([
            ['en', 'English'],
            ['es', 'Español'],
            ['fr', 'Français'],
            ['de', 'Deutsch'],
            ['it', 'Italiano'],
        ])
        expect(radios(element).find((radio) => radio.checked)?.value).toBe('fr')
        expect(radios(element)[2]?.closest('label')?.querySelector('[lang="fr"]')).not.toBeNull()
    })

    it('saves a chosen language through the account language service', () => {
        const fixture = renderAt('/fr/settings/language')

        radios(fixture.nativeElement)
            .find((radio) => radio.value === 'en')
            ?.click()

        expect(save).toHaveBeenCalledWith('en')
    })

    describe('when the language is not saved on the account (#242)', () => {
        it('checks the page’s language again and says why below, instead of leaving the clicked one checked', async () => {
            save.mockImplementation(async (locale: Locale) => failure.set({ locale, maybeSaved: false }))
            const fixture = renderAt('/fr/settings/language')
            const element: HTMLElement = fixture.nativeElement

            radios(element)
                .find((radio) => radio.value === 'en')
                ?.click()
            await fixture.whenStable()
            fixture.detectChanges()

            expect(
                radios(element)
                    .filter((radio) => radio.checked)
                    .map((radio) => radio.value),
            ).toEqual(['fr'])
            expect(element.querySelector('[data-testid="language-save-error"]')?.textContent).toContain(
                'We couldn’t save English on your account.',
            )
        })

        it('takes no other choice while one is being saved', () => {
            const fixture = renderAt('/fr/settings/language')
            saving.set('en')
            fixture.detectChanges()

            const fieldset = (fixture.nativeElement as HTMLElement).querySelector('fieldset') as HTMLFieldSetElement
            expect(fieldset.disabled).toBe(true)
            expect(fieldset.getAttribute('aria-busy')).toBe('true')
        })

        it('puts the message away when Settings is left', () => {
            const fixture = renderAt('/fr/settings/language')

            fixture.destroy()

            expect(dismissFailure).toHaveBeenCalledTimes(1)
        })
    })

    it('does nothing when the page’s own language is chosen again', () => {
        const fixture = renderAt('/fr/settings/language')

        fixture.componentInstance.choose('fr')

        expect(save).not.toHaveBeenCalled()
    })
})
