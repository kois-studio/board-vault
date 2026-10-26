import { DOCUMENT, Injectable, inject } from '@angular/core'
import { Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { environment } from '../../../environments/environment'
import { Api } from '../../api/api'
import type { UserType } from '../../api/api.types'
import { DataService } from '../services/data.service'
import { LogService } from '../services/log.service'
import { type Locale, localeCookie, localeOfPath, localizedUrl, menuLocales } from './locales'

/** Set once the page followed the account's language, so a language chosen later in the session is not undone. */
export const LANGUAGE_FOLLOWED_KEY = 'bv_lang_followed'

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

    /** Remembers the choice, saves it on the account when signed in, and loads the same page in that language. */
    public async choose(locale: Locale): Promise<void> {
        this.writeCookie(locale)
        const user = this.dataService.currentUser()
        if (user) {
            try {
                await firstValueFrom(this.api.updateUser(user.id, { locale }))
                this.dataService.currentUser.set({ ...user, locale })
            } catch (error) {
                // The page still changes language; the account keeps its old one.
                this.logger.error('AccountLanguageService: could not save the language on the account.', error)
            }
        }
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
