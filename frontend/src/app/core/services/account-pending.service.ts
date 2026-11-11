import { computed, effect, Injectable, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import {
    type ActivatedRouteSnapshot,
    NavigationCancel,
    NavigationCancellationCode,
    NavigationEnd,
    NavigationError,
    NavigationSkipped,
    Router,
} from '@angular/router'
import { filter } from 'rxjs/operators'
import { LoginService } from './login.service'

/** Route data flag for the focused-pages layout, which has no header: its boot frame is the page skeleton alone. */
export const FOCUSED_LAYOUT = 'focusedLayout'

/** "Connecting you…" only shows when finishing sign-in takes longer than this; until then the page skeleton does. */
export const HANDOFF_CARD_AFTER_MS = 2_000

/** A first navigation cancelled for one of these has another one on its way, which ends the frame instead. */
const REPLACED = new Set<NavigationCancellationCode | undefined>([
    NavigationCancellationCode.SupersededByNewNavigation,
    NavigationCancellationCode.Redirect,
])

/** Which frame the first page shows while it waits for sign-in: the app's (header and tabs) or a focused page's. */
export type BootFrame = 'app' | 'focused'

/**
 * What a signed-in person sees while their account is not known yet (#259): the app's frame and a page-shaped
 * skeleton, from the first paint, instead of a blank page or a card.
 *
 * - Before Clerk has loaded, `AuthOnlyGuard` holds the first page; `bootFrame` tells `AppComponent` to show the
 *   frame meanwhile. Nobody knows yet whether the person is signed in, so it never says anything about sign-in.
 * - Once Clerk reports a signed-in person, the layouts show the same skeleton while Board Vault confirms the account
 *   (`LoginService.isClerkAuthHandoffActive`), and the handoff card only if that takes a while, fails, or Board Vault
 *   cannot be reached.
 */
@Injectable({ providedIn: 'root' })
export class AccountPendingService {
    private readonly loginService = inject(LoginService)
    private readonly router = inject(Router)

    /** Set while the very first page waits in its guard; cleared when that navigation ends, however it ends. */
    public readonly bootFrame = signal<BootFrame | null>(null)

    /** The person may be signed in and their account is not known yet: the frame shows, without the account's own controls. */
    public readonly isPending = computed(() => this.bootFrame() !== null || this.loginService.isClerkAuthHandoffActive())

    /** The app's own frame (section bars, the app footer) instead of the signed-out one: signed in, or maybe about to be. */
    public readonly showsAppFrame = computed(() => this.loginService.isAuthenticated() || this.isPending())

    /** The card has shown during this sign-in: it stays until the account is known, so Try again never swaps it back. */
    private readonly cardHasShown = signal(false)

    private readonly handoffFailed = computed(() => {
        const state = this.loginService.clerkAuthHandoffState()
        return state === 'error' || state === 'unavailable'
    })

    /** The handoff card instead of the skeleton: finishing sign-in failed, cannot reach Board Vault, or is slow. */
    public readonly showsHandoffCard = computed(
        () => this.loginService.isClerkAuthHandoffActive() && (this.handoffFailed() || this.cardHasShown()),
    )

    constructor() {
        effect((onCleanup) => {
            if (!this.loginService.isClerkAuthHandoffActive()) {
                this.cardHasShown.set(false)
                return
            }
            const timer = setTimeout(() => this.cardHasShown.set(true), HANDOFF_CARD_AFTER_MS)
            onCleanup(() => clearTimeout(timer))
        })
        effect(() => {
            if (this.loginService.isClerkAuthHandoffActive() && this.handoffFailed()) this.cardHasShown.set(true)
        })

        this.router.events
            .pipe(
                filter(
                    (event) =>
                        event instanceof NavigationEnd ||
                        event instanceof NavigationCancel ||
                        event instanceof NavigationError ||
                        event instanceof NavigationSkipped,
                ),
                takeUntilDestroyed(),
            )
            .subscribe((event) => {
                // A navigation that replaced this one (a section link in the frame, a guard's redirect) is still
                // on its way: the frame stays instead of blinking out until that page's guard shows it again.
                if (event instanceof NavigationCancel && REPLACED.has(event.code)) return
                this.bootFrame.set(null)
            })
    }

    /**
     * Called by the guards that wait for Clerk. Only the first page needs the frame: later pages open inside a
     * layout that is already on screen.
     */
    public showBootFrameWhileWaiting(route: ActivatedRouteSnapshot): void {
        if (this.router.navigated) return
        const focused = route.pathFromRoot.some((snapshot) => snapshot.data?.[FOCUSED_LAYOUT] === true)
        this.bootFrame.set(focused ? 'focused' : 'app')
    }
}
