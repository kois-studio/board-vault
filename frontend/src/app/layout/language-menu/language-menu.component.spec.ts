import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { LanguageMenuComponent, languageMenuLocales } from './language-menu.component'

@Component({ template: '' })
class EmptyPageComponent {}

describe('languageMenuLocales', () => {
    it('offers nothing on a development server, which serves one language without a prefix', () => {
        expect(languageMenuLocales('/dashboard', true)).toEqual([])
        expect(languageMenuLocales('/', true)).toEqual([])
        expect(languageMenuLocales('/xx/dashboard', true)).toEqual([])
    })

    it('offers nothing in production while English is the only finished language', () => {
        expect(languageMenuLocales('/en/dashboard', false)).toEqual([])
    })

    it('lets someone on an unfinished language’s address go back to a finished one', () => {
        expect(languageMenuLocales('/fr/dashboard', false)).toEqual(['en', 'fr'])
    })

    it('offers every language in preview', () => {
        expect(languageMenuLocales('/en/', true)).toEqual(['en', 'es', 'fr', 'de', 'it'])
        expect(languageMenuLocales('/de', true)).toEqual(['en', 'es', 'fr', 'de', 'it'])
    })
})

describe('LanguageMenuComponent', () => {
    let fixture: ComponentFixture<LanguageMenuComponent>
    const originalPath = window.location.pathname

    const element = () => fixture.nativeElement as HTMLElement
    const trigger = () => element().querySelector('button') as HTMLButtonElement
    const links = () => Array.from(element().querySelectorAll<HTMLAnchorElement>('#language-menu a'))

    beforeEach(async () => {
        // The page is the Spanish build's group page.
        window.history.replaceState(null, '', '/es/groups/12')
        await TestBed.configureTestingModule({
            imports: [LanguageMenuComponent],
            providers: [provideRouter([{ path: '**', component: EmptyPageComponent }])],
        }).compileComponents()
        await TestBed.inject(Router).navigateByUrl('/groups/12?tab=games#library')

        fixture = TestBed.createComponent(LanguageMenuComponent)
        fixture.componentRef.setInput('locales', ['en', 'es', 'fr', 'de', 'it'])
        fixture.detectChanges()
    })

    afterEach(() => {
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
