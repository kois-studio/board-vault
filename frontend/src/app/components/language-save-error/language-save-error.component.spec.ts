import { signal } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { AccountLanguageService, type LanguageSaveFailure } from '../../core/i18n/account-language.service'
import type { Locale } from '../../core/i18n/locales'
import { LanguageSaveErrorComponent } from './language-save-error.component'

describe('LanguageSaveErrorComponent (#242)', () => {
    let fixture: ComponentFixture<LanguageSaveErrorComponent>
    let failure: ReturnType<typeof signal<LanguageSaveFailure | null>>
    let saving: ReturnType<typeof signal<Locale | null>>
    let service: { choose: ReturnType<typeof vi.fn>; switchForNow: ReturnType<typeof vi.fn> }

    const element = () => fixture.nativeElement as HTMLElement
    const message = () => element().querySelector('[data-testid="language-save-error"]')
    const button = (label: string) =>
        Array.from(element().querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === label) as HTMLButtonElement

    const render = (initial: LanguageSaveFailure | null = null) => {
        failure = signal(initial)
        saving = signal(null)
        service = { choose: vi.fn(), switchForNow: vi.fn() }
        TestBed.configureTestingModule({
            providers: [{ provide: AccountLanguageService, useValue: { ...service, failure, saving } }],
        })
        fixture = TestBed.createComponent(LanguageSaveErrorComponent)
        document.body.append(element())
        fixture.detectChanges()
    }

    afterEach(() => element().remove())

    it('shows nothing while every choice is saved', () => {
        render()

        expect(message()).toBeNull()
    })

    it('names the language, says the next sign-in goes back, and offers Try again or Switch for now', () => {
        render()
        failure.set({ locale: 'es', maybeSaved: false })
        fixture.detectChanges()

        expect(message()?.getAttribute('role')).toBe('alert')
        expect(message()?.textContent).toContain('We couldn’t save Español on your account.')
        expect(message()?.textContent).toContain('your next sign-in goes back to your account’s language')
        expect(message()?.textContent?.replace(/\s+/g, ' ')).toContain('on your account. If you switch for now')

        button('Try again').click()
        expect(service.choose).toHaveBeenCalledWith('es')
        button('Switch for now').click()
        expect(service.switchForNow).toHaveBeenCalledWith('es')
    })

    it('says it could not confirm the save when Board Vault did not answer in time', () => {
        render()
        failure.set({ locale: 'it', maybeSaved: true })
        fixture.detectChanges()

        expect(message()?.textContent).toContain('We couldn’t confirm Italiano was saved on your account.')
    })

    it('shows Try again busy, and Switch for now unavailable, while it tries', () => {
        render({ locale: 'es', maybeSaved: false })
        saving.set('es')
        fixture.detectChanges()

        expect(button('Try again').getAttribute('aria-busy')).toBe('true')
        expect(button('Switch for now').disabled).toBe(true)
    })

    it('puts focus on Try again when a save has just failed, again after another failure', async () => {
        render()
        failure.set({ locale: 'es', maybeSaved: false })
        fixture.detectChanges()
        await fixture.whenStable()
        expect(document.activeElement).toBe(button('Try again'))

        ;(document.activeElement as HTMLElement).blur()
        failure.set({ locale: 'es', maybeSaved: false })
        fixture.detectChanges()
        await fixture.whenStable()
        expect(document.activeElement).toBe(button('Try again'))
    })

    it('does not take focus for a message already there when it appears, as in a menu opened later', async () => {
        render({ locale: 'es', maybeSaved: false })
        await fixture.whenStable()

        expect(document.activeElement).not.toBe(button('Try again'))
    })
})
