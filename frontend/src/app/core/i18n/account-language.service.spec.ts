import { DOCUMENT, signal, type WritableSignal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
import { environment } from '../../../environments/environment'
import { Api } from '../../api/api'
import type { UserType } from '../../api/api.types'
import { DataService } from '../services/data.service'
import { LogService } from '../services/log.service'
import { ApiUnavailableError } from '../utils/apiUnavailable'
import { AccountLanguageService, LANGUAGE_FOLLOWED_KEY } from './account-language.service'
import type { Locale } from './locales'

describe('AccountLanguageService', () => {
    const user = { id: 7, locale: null } as unknown as UserType
    const originalPreview = environment.previewLocales

    let location: {
        pathname: string
        search: string
        hash: string
        protocol: string
        assign: ReturnType<typeof vi.fn>
        replace: ReturnType<typeof vi.fn>
    }
    let fakeDocument: { cookie: string; location: typeof location }
    let updateUser: ReturnType<typeof vi.fn>
    let currentUser: WritableSignal<UserType | null>

    function setup(pathname: string, signedIn: boolean) {
        location = { pathname, search: '?tab=games', hash: '#top', protocol: 'https:', assign: vi.fn(), replace: vi.fn() }
        fakeDocument = { cookie: '', location }
        updateUser = vi.fn().mockReturnValue(of({ success: true }))
        currentUser = signal<UserType | null>(signedIn ? user : null)
        TestBed.configureTestingModule({
            providers: [
                AccountLanguageService,
                { provide: DOCUMENT, useValue: fakeDocument },
                { provide: Api, useValue: { updateUser } },
                { provide: Router, useValue: { url: '/groups/12?tab=games' } },
                { provide: DataService, useValue: { currentUser } },
                { provide: LogService, useValue: { error: vi.fn() } },
            ],
        })
        return TestBed.inject(AccountLanguageService)
    }

    afterEach(() => {
        environment.previewLocales = originalPreview
        sessionStorage.clear()
    })

    describe('choose', () => {
        it('writes the cookie, saves on the account, updates the local account, then loads the page in that language', async () => {
            const service = setup('/en/groups/12', true)

            await service.choose('es')

            expect(fakeDocument.cookie).toContain('bv_lang=es')
            expect(updateUser).toHaveBeenCalledWith(7, { locale: 'es' })
            expect(currentUser()).toMatchObject({ id: 7, locale: 'es' })
            expect(location.assign).toHaveBeenCalledWith('/es/groups/12?tab=games')
            expect(updateUser.mock.invocationCallOrder[0]).toBeLessThan(location.assign.mock.invocationCallOrder[0] as number)
        })

        it('does not save anything when signed out', async () => {
            const service = setup('/en/groups/12', false)

            await service.choose('de')

            expect(updateUser).not.toHaveBeenCalled()
            expect(fakeDocument.cookie).toContain('bv_lang=de')
            expect(location.assign).toHaveBeenCalledWith('/de/groups/12?tab=games')
        })

        describe('when the save fails (#242)', () => {
            const unavailable = (outcomeUnknown: boolean) =>
                throwError(() => new ApiUnavailableError({ kind: 'timeout', outcomeUnknown, url: '/users/7' }))

            it('stays on the page in its language and says the choice was not saved, instead of switching', async () => {
                const service = setup('/en/groups/12', true)
                updateUser.mockReturnValue(unavailable(false))

                await service.choose('fr')

                expect(location.assign).not.toHaveBeenCalled()
                expect(fakeDocument.cookie).toBe('')
                expect(currentUser()).toBe(user)
                expect(service.failure()).toEqual({ locale: 'fr', maybeSaved: false })
                expect(service.saving()).toBeNull()
            })

            it('says it may be saved after all when Board Vault did not answer in time', async () => {
                const service = setup('/en/groups/12', true)
                updateUser.mockReturnValue(unavailable(true))

                await service.choose('fr')

                expect(service.failure()).toEqual({ locale: 'fr', maybeSaved: true })
            })

            it('treats any other failure as not saved', async () => {
                const service = setup('/en/groups/12', true)
                updateUser.mockReturnValue(throwError(() => new Error('500')))

                await service.choose('fr')

                expect(service.failure()).toEqual({ locale: 'fr', maybeSaved: false })
            })

            it('keeps the message while Try again waits, then switches once it is saved', async () => {
                const service = setup('/en/groups/12', true)
                updateUser.mockReturnValue(unavailable(false))
                await service.choose('fr')
                const answer = new Subject<{ success: true }>()
                updateUser.mockReturnValue(answer)

                const retried = service.choose('fr')
                expect(service.saving()).toBe('fr')
                expect(service.failure()).toEqual({ locale: 'fr', maybeSaved: false })

                answer.next({ success: true })
                answer.complete()
                await retried

                expect(service.failure()).toBeNull()
                expect(currentUser()).toMatchObject({ locale: 'fr' })
                expect(location.assign).toHaveBeenCalledWith('/fr/groups/12?tab=games')
            })

            it('neither switches nor speaks for another account signed in while it saved', async () => {
                const service = setup('/en/groups/12', true)
                const someoneElse = { id: 8, locale: 'de' } as unknown as UserType
                const answer = new Subject<{ success: true }>()
                updateUser.mockReturnValue(answer)

                const chosen = service.choose('fr')
                currentUser.set(someoneElse)
                answer.next({ success: true })
                answer.complete()
                await chosen

                expect(currentUser()).toBe(someoneElse)
                expect(location.assign).not.toHaveBeenCalled()
                expect(service.saving()).toBeNull()
                expect(service.failure()).toBeNull()

                updateUser.mockReturnValue(unavailable(false))
                currentUser.set(user)
                const failed = service.choose('fr')
                currentUser.set(null)
                await failed

                expect(service.failure()).toBeNull()
                expect(service.saving()).toBeNull()
            })

            it('takes no other choice while one is being saved', async () => {
                const service = setup('/en/groups/12', true)
                const answer = new Subject<{ success: true }>()
                updateUser.mockReturnValue(answer)

                void service.choose('fr')
                await service.choose('de')

                expect(updateUser).toHaveBeenCalledTimes(1)
                expect(updateUser).toHaveBeenCalledWith(7, { locale: 'fr' })
            })

            it('switches for now only when asked, and this session does not go back to the account language', async () => {
                const service = setup('/en/groups/12', true)
                updateUser.mockReturnValue(unavailable(false))
                await service.choose('fr')

                service.switchForNow('fr')

                expect(service.failure()).toBeNull()
                expect(fakeDocument.cookie).toContain('bv_lang=fr')
                expect(location.assign).toHaveBeenCalledWith('/fr/groups/12?tab=games')
                expect(sessionStorage.getItem(LANGUAGE_FOLLOWED_KEY)).not.toBeNull()
                expect(updateUser).toHaveBeenCalledTimes(1)
            })

            it('puts the message away once it is no longer next to the choice', async () => {
                const service = setup('/en/groups/12', true)
                updateUser.mockReturnValue(unavailable(false))
                await service.choose('fr')

                service.dismissFailure()

                expect(service.failure()).toBeNull()
            })
        })
    })

    describe('followAccountLanguage', () => {
        const follow = (service: AccountLanguageService, locale: Locale | null) => service.followAccountLanguage({ locale })

        it('moves the page to the account language once per session, keeping path, query and hash', () => {
            environment.previewLocales = true
            const service = setup('/en/groups/12', false)

            follow(service, 'es')
            follow(service, 'es')

            expect(location.replace).toHaveBeenCalledTimes(1)
            expect(location.replace).toHaveBeenCalledWith('/es/groups/12?tab=games#top')
            expect(fakeDocument.cookie).toContain('bv_lang=es')
            expect(sessionStorage.getItem(LANGUAGE_FOLLOWED_KEY)).not.toBeNull()
        })

        it('keeps the root of a language as its root', () => {
            environment.previewLocales = true
            const service = setup('/en', false)

            follow(service, 'it')

            expect(location.replace).toHaveBeenCalledWith('/it/?tab=games#top')
        })

        it('does not move again in a session that already followed', () => {
            environment.previewLocales = true
            sessionStorage.setItem(LANGUAGE_FOLLOWED_KEY, '1')
            const service = setup('/en/dashboard', false)

            follow(service, 'es')

            expect(location.replace).not.toHaveBeenCalled()
        })

        it('does not move an account without a language', () => {
            environment.previewLocales = true
            follow(setup('/en/dashboard', false), null)

            expect(location.replace).not.toHaveBeenCalled()
            expect(sessionStorage.getItem(LANGUAGE_FOLLOWED_KEY)).toBeNull()
        })

        it('does not move a page already in the account language', () => {
            environment.previewLocales = true
            follow(setup('/es/dashboard', false), 'es')

            expect(location.replace).not.toHaveBeenCalled()
        })

        it('does not move a page without a language prefix, as on a development server', () => {
            environment.previewLocales = true
            follow(setup('/dashboard', false), 'es')

            expect(location.replace).not.toHaveBeenCalled()
        })

        it('moves into an offered language in production', () => {
            environment.previewLocales = false
            follow(setup('/en/dashboard', false), 'es')

            expect(location.replace).toHaveBeenCalledWith('/es/dashboard?tab=games#top')
        })

        it('moves from an unfinished language to an offered one', () => {
            environment.previewLocales = false
            follow(setup('/fr/dashboard', false), 'en')

            expect(location.replace).toHaveBeenCalledWith('/en/dashboard?tab=games#top')
        })
    })
})
