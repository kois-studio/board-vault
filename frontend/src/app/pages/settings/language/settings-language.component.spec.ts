import { TestBed } from '@angular/core/testing'
import { AccountLanguageService } from '../../../core/i18n/account-language.service'
import { SettingsLanguageComponent } from './settings-language.component'

describe('SettingsLanguageComponent', () => {
    const originalPath = window.location.pathname
    const save = vi.fn()

    afterEach(() => {
        window.history.replaceState(null, '', originalPath)
        save.mockClear()
    })

    function renderAt(path: string) {
        window.history.replaceState(null, '', path)
        TestBed.configureTestingModule({ providers: [{ provide: AccountLanguageService, useValue: { choose: save } }] })
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
            ['fr', 'Français'],
        ])
        expect(radios(element).find((radio) => radio.checked)?.value).toBe('fr')
        expect(radios(element)[1]?.closest('label')?.querySelector('[lang="fr"]')).not.toBeNull()
    })

    it('saves a chosen language through the account language service', () => {
        const fixture = renderAt('/fr/settings/language')

        radios(fixture.nativeElement)
            .find((radio) => radio.value === 'en')
            ?.click()

        expect(save).toHaveBeenCalledWith('en')
    })

    it('does nothing when the page’s own language is chosen again', () => {
        const fixture = renderAt('/fr/settings/language')

        fixture.componentInstance.choose('fr')

        expect(save).not.toHaveBeenCalled()
    })
})
