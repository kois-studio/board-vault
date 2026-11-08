import { DOCUMENT, Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { Api } from '../../api/api'
import type { UserType } from '../../api/api.types'
import { DataService } from '../services/data.service'
import { LogService } from '../services/log.service'
import { isSaveOutcomeUnknown } from '../utils/apiUnavailable'
import { type Locale, localeCookie, localeOfPath, localizedUrl, menuLocales } from './locales'

/** Set once the page followed the account's language, so a language chosen later in the session is not undone. */
export const LANGUAGE_FOLLOWED_KEY = 'bv_lang_followed'

/** A language chosen while signed in that could not be saved on the account (#242). */
export interface LanguageSaveFailure {
    locale: Locale
    /** Board Vault did not answer in time: it may be saved after all. */
    maybeSaved: boolean
}

/**
 * The language of the account (ADR-0024). A choice is written to the `bv_lang` cookie and, when signed in, saved
 * on the account; signing in on another device then opens the app in that language, once per browser session.
 * It reads the signed-in account from DataService rather than LoginService, which calls this service.
 */
@Injectable({ providedIn: 'root' })
export class AccountLanguageService {
    private readonly api = inject(Api)
    private readonly router = inject(Router)
    private readonly document = inject(DOCUMENT)
    private readonly dataService = inject(DataService)
    private readonly logger = inject(LogService)

    /** The language being saved on the account; the pickers show they are busy and take no other choice meanwhile. */
    public readonly saving = signal<Locale | null>(null)
    /** The last choice that could not be saved; the pickers say so and offer to try again or switch for now only. */
    public readonly failure = signal<LanguageSaveFailure | null>(null)

    /**
     * Signed in, saves the choice on the account first and loads the same page in that language only once it is
     * saved (#242). A failed save leaves the page as it is and sets `failure`: switching anyway would be undone on
     * the next sign-in, so the person decides (`switchForNow`). Signed out, remembers it in the cookie and loads.
     */
    public async choose(locale: Locale): Promise<void> {
        const user = this.dataService.currentUser()
        if (!user) return this.load(locale)
        if (this.saving()) return

        // A failure on screen stays until this one is answered, so its Try again shows it is busy instead of vanishing.
        this.saving.set(locale)
        try {
            await firstValueFrom(this.api.updateUser(user.id, { locale }))
        } catch (error) {
            this.logger.error('AccountLanguageService: could not save the language on the account.', error)
            this.saving.set(null)
            if (this.dataService.currentUser()?.id !== user.id) return
            this.failure.set({ locale, maybeSaved: isSaveOutcomeUnknown(error) })
            return
        }
        // Signed out or into another account meanwhile: that account's language is not this one.
        if (this.dataService.currentUser()?.id !== user.id) {
            this.saving.set(null)
            this.failure.set(null)
            return
        }
        this.failure.set(null)
        this.dataService.currentUser.set({ ...user, locale })
        this.load(locale)
    }

    /**
     * After a failed save: loads the page in that language without saving it on the account. This browser session
     * keeps it (the account's language is not followed again); the next sign-in uses the account's language.
     */
    public switchForNow(locale: Locale): void {
        this.failure.set(null)
        this.markFollowed()
        this.load(locale)
    }

    /** The message is no longer next to where the choice was made (the menu closed, Settings was left). */
    public dismissFailure(): void {
        this.failure.set(null)
    }

    private load(locale: Locale): void {
        this.writeCookie(locale)
        this.document.location.assign(localizedUrl(locale, this.router.url))
    }

    /** Once per browser session, moves the page to the account's language when it is not the page's. */
    public followAccountLanguage(user: Pick<UserType, 'locale'>): void {
        const wanted = user.locale
        const current = localeOfPath(this.document.location.pathname)
        if (!wanted || !current || wanted === current) return
        if (!menuLocales(current, environment.previewLocales).includes(wanted)) return
        if (this.wasFollowed()) return

        this.markFollowed()
        this.writeCookie(wanted)
        const { pathname, search, hash } = this.document.location
        this.document.location.replace(`/${wanted}${pathname.slice(current.length + 1) || '/'}${search}${hash}`)
    }

    private writeCookie(locale: Locale): void {
        this.document.cookie = localeCookie(locale, this.document.location.protocol === 'https:')
    }

    private wasFollowed(): boolean {
        try {
            return sessionStorage.getItem(LANGUAGE_FOLLOWED_KEY) !== null
        } catch {
            return false
        }
    }

    private markFollowed(): void {
        try {
            sessionStorage.setItem(LANGUAGE_FOLLOWED_KEY, '1')
        } catch {
            // Without session storage the page may move again on the next sign-in check; that is harmless.
        }
    }
}
