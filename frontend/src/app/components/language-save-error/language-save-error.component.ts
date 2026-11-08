import { afterNextRender, Component, computed, ElementRef, effect, Injector, inject, untracked, viewChild } from '@angular/core'
import { AccountLanguageService } from '../../core/i18n/account-language.service'
import { LOCALE_NAMES, type Locale } from '../../core/i18n/locales'
import { ButtonComponent } from '../ui/button/button.component'
import { IconComponent } from '../ui/icon/icon.component'

/**
 * Says that a language chosen while signed in was not saved on the account (#242), under both language pickers
 * (the header's menu and Settings → Language). The page stays in its language until the person tries again or
 * switches for now only, which the next sign-in undoes.
 */
@Component({
    imports: [ButtonComponent, IconComponent],
    selector: 'app-language-save-error',
    template: `
        @if (failure(); as failure) {
            <div role="alert" class="rounded-lg border border-bv-danger/40 bg-bv-surface p-3 text-sm" data-testid="language-save-error">
                <p class="flex gap-2 text-bv-text">
                    <app-icon name="circle-alert" [size]="16" className="mt-0.5 shrink-0 text-bv-danger" aria-hidden="true" />
                    <span>
                        @if (failure.maybeSaved) {
                            <ng-container i18n="Under the language choices when Board Vault did not answer in time, so the chosen language may or may not be saved on the account; the placeholder is the language's name in itself, such as Español">We couldn’t confirm {{ languageName() }} was saved on your account.</ng-container>
                        } @else {
                            <ng-container i18n="Under the language choices when the chosen language could not be saved on the account; the placeholder is the language's name in itself, such as Español">We couldn’t save {{ languageName() }} on your account.</ng-container>
                        }
                        <!-- A space between the sentences: &ngsp; next to a block is dropped. -->
                        {{ ' ' }}<span class="text-bv-text-muted" i18n="Under the language choices after a language could not be saved on the account, explaining the Switch for now button">If you switch for now, your next sign-in goes back to your account’s language.</span>
                    </span>
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                    <button #retryButton appButton size="small" variant="secondary" icon="refresh" [loading]="saving() !== null" (click)="retry(failure.locale)" i18n="Button under the language choices that tries again to save the chosen language on the account">Try again</button>
                    <button appButton size="small" variant="secondary" [disabled]="saving() !== null" (click)="switchForNow(failure.locale)" i18n="Button under the language choices that changes the page's language without saving it on the account">Switch for now</button>
                </div>
            </div>
        }
    `,
})
export class LanguageSaveErrorComponent {
    private readonly accountLanguage = inject(AccountLanguageService)
    private readonly injector = inject(Injector)
    private readonly retryButton = viewChild('retryButton', { read: ElementRef<HTMLButtonElement> })

    public readonly failure = this.accountLanguage.failure
    public readonly saving = this.accountLanguage.saving
    public readonly languageName = computed(() => {
        const failure = this.failure()
        return failure ? LOCALE_NAMES[failure.locale] : ''
    })

    constructor() {
        // A save that just failed: the language that was chosen could not keep focus while it saved, and Try again
        // is the way forward. Not for a failure already there when this view appeared (a menu opened later).
        let seen = untracked(this.failure)
        effect(() => {
            const failure = this.failure()
            if (failure === seen) return
            seen = failure
            if (failure) afterNextRender(() => this.retryButton()?.nativeElement.focus(), { injector: this.injector })
        })
    }

    public retry(locale: Locale): void {
        void this.accountLanguage.choose(locale)
    }

    public switchForNow(locale: Locale): void {
        this.accountLanguage.switchForNow(locale)
    }
}
