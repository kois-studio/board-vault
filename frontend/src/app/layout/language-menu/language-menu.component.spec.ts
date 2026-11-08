import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { AccountLanguageService, type LanguageSaveFailure } from '../../core/i18n/account-language.service'
import type { Locale } from '../../core/i18n/locales'
import { DataService } from '../../core/services/data.service'
import { LanguageMenuComponent, languageMenuLocales } from './language-menu.component'

@Component({ template: '' })
class EmptyPageComponent {}

describe('languageMenuLocales', () => {
    it('offers nothing on a development server, which serves one language without a prefix', () => {
        expect(languageMenuLocales('/dashboard', true)).toEqual([])
        expect(languageMenuLocales('/', true)).toEqual([])
        expect(languageMenuLocales('/xx/dashboard', true)).toEqual([])
    })

    // Which languages are finished, and the way back from an unfinished one, is menuLocales() in locales.spec.ts.
    it('offers every finished language in production', () => {
        expect(languageMenuLocales('/fr/dashboard', false)).toEqual(['en', 'es', 'fr', 'de', 'it'])
    })

    it('offers every language in preview', () => {
        expect(languageMenuLocales('/en/', true)).toEqual(['en', 'es', 'fr', 'de', 'it'])
        expect(languageMenuLocales('/de', true)).toEqual(['en', 'es', 'fr', 'de', 'it'])
    })
})

describe('LanguageMenuComponent', () => {
    let fixture: ComponentFixture<LanguageMenuComponent>
    const originalPath = window.location.pathname
    const currentUser = signal<unknown>(null)
    const choose = vi.fn()
    const saving = signal<Locale | null>(null)
    const failure = signal<LanguageSaveFailure | null>(null)
    const dismissFailure = vi.fn()

    const element = () => fixture.nativeElement as HTMLElement
    const trigger = () => element().querySelector('button') as HTMLButtonElement
    const links = () => Array.from(element().querySelectorAll<HTMLAnchorElement>('#language-menu a'))

    beforeEach(async () => {
        // The page is the Spanish build's group page.
        window.history.replaceState(null, '', '/es/groups/12')
        await TestBed.configureTestingModule({
            imports: [LanguageMenuComponent],
            providers: [
                provideRouter([{ path: '**', component: EmptyPageComponent }]),
                { provide: DataService, useValue: { currentUser } },
                { provide: AccountLanguageService, useValue: { choose, saving, failure, dismissFailure, switchForNow: vi.fn() } },
            ],
        }).compileComponents()
        await TestBed.inject(Router).navigateByUrl('/groups/12?tab=games#library')

        fixture = TestBed.createComponent(LanguageMenuComponent)
        fixture.componentRef.setInput('locales', ['en', 'es', 'fr', 'de', 'it'])
        fixture.detectChanges()
    })

    afterEach(() => {
        currentUser.set(null)
        choose.mockClear()
        dismissFailure.mockClear()
        saving.set(null)
        failure.set(null)
        window.history.replaceState(null, '', originalPath)
        // biome-ignore lint/suspicious/noDocumentCookie: removes the cookie a test chose.
        document.cookie = 'bv_lang=; Path=/; Max-Age=0'
    })

    it('names the button after the page’s language and shows its code', () => {
        expect(trigger().getAttribute('aria-label')).toBe('Language: Español')
        expect(trigger().textContent?.trim()).toBe('es')
        expect(trigger().getAttribute('aria-expanded')).toBe('false')
        expect(element().querySelector('#language-menu')).toBeNull()
    })

    it('lists the other languages by their own names, each a link to the same page in it', () => {
        trigger().click()
        fixture.detectChanges()

        expect(trigger().getAttribute('aria-expanded')).toBe('true')
        expect(links().map((link) => [link.textContent?.trim(), link.getAttribute('href'), link.hreflang, link.lang])).toEqual([
            ['English', '/en/groups/12?tab=games#library', 'en', 'en'],
            ['Français', '/fr/groups/12?tab=games#library', 'fr', 'fr'],
            ['Deutsch', '/de/groups/12?tab=games#library', 'de', 'de'],
            ['Italiano', '/it/groups/12?tab=games#library', 'it', 'it'],
        ])
    })

    it('marks the current language instead of linking to it', () => {
        trigger().click()
        fixture.detectChanges()

        const current = element().querySelector('[aria-current="true"]') as HTMLElement
        expect(current.textContent?.trim()).toBe('Español')
        expect(current.lang).toBe('es')
        expect(current.tagName).toBe('SPAN')
    })

    it('remembers the choice for addresses without a language', () => {
        trigger().click()
        fixture.detectChanges()

        // jsdom does not load other pages; the link still runs its handler first.
        const stay = (event: Event) => event.preventDefault()
        document.addEventListener('click', stay)
        links()
            .find((link) => link.hreflang === 'de')
            ?.click()
        document.removeEventListener('click', stay)

        expect(document.cookie).toContain('bv_lang=de')
        expect(choose).not.toHaveBeenCalled()
    })

    it('signed in, saves the choice on the account before leaving and does not follow the link itself', () => {
        currentUser.set({ id: 7 })
        trigger().click()
        fixture.detectChanges()

        const event = new MouseEvent('click', { bubbles: true, cancelable: true })
        links()
            .find((link) => link.hreflang === 'de')
            ?.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(true)
        expect(choose).toHaveBeenCalledWith('de')
        expect(
            links()
                .find((link) => link.hreflang === 'de')
                ?.getAttribute('href'),
        ).toBe('/de/groups/12?tab=games#library')
    })

    describe('when the language is not saved on the account (#242)', () => {
        it('stays on the page and says why inside the open menu', () => {
            currentUser.set({ id: 7 })
            trigger().click()
            fixture.detectChanges()

            failure.set({ locale: 'de', maybeSaved: false })
            fixture.detectChanges()

            expect(element().querySelector('#language-menu [data-testid="language-save-error"]')?.textContent).toContain(
                'We couldn’t save Deutsch on your account.',
            )
        })

        it('shows the links waiting while a choice is being saved', () => {
            trigger().click()
            saving.set('de')
            fixture.detectChanges()

            expect(element().querySelector('#language-menu ul')?.getAttribute('aria-busy')).toBe('true')
            expect(links().every((link) => link.getAttribute('aria-disabled') === 'true')).toBe(true)
        })

        it('puts the message away when the menu closes, not before', () => {
            expect(dismissFailure).not.toHaveBeenCalled()
            trigger().click()
            fixture.detectChanges()
            expect(dismissFailure).not.toHaveBeenCalled()

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
            fixture.detectChanges()

            expect(dismissFailure).toHaveBeenCalledTimes(1)
        })

        it('keeps the answer for a choice still saving when the menu closes, so reopening it shows why', () => {
            trigger().click()
            fixture.detectChanges()
            saving.set('de')

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
            fixture.detectChanges()

            expect(dismissFailure).not.toHaveBeenCalled()
        })
    })

    it('closes with Escape and gives focus back to the button', () => {
        trigger().click()
        fixture.detectChanges()

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        fixture.detectChanges()

        expect(element().querySelector('#language-menu')).toBeNull()
        expect(document.activeElement).toBe(trigger())
    })
})
