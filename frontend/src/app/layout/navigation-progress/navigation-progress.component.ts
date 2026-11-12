import { Component, DestroyRef, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router } from '@angular/router'

/** How long a navigation may take before the bar shows: quicker ones would only flash it. */
export const NAVIGATION_PROGRESS_DELAY_MS = 300

/**
 * A thin bar along the top while moving to another page takes a while (#264): its code is still loading, or a guard
 * is waiting. Not on the first page, which has the boot frame and its skeleton (#259).
 */
@Component({
    selector: 'app-navigation-progress',
    template: `
        @if (shown()) {
            <div
                class="navigation-progress"
                role="progressbar"
                i18n-aria-label="Accessible name of the thin bar along the top of the window while the next page opens"
                aria-label="Opening the page"
                data-testid="navigation-progress"
            >
                <div class="navigation-progress__bar"></div>
            </div>
        }
    `,
    styles: `
        .navigation-progress {
            position: fixed;
            inset: 0 0 auto;
            z-index: 90;
            height: 3px;
            overflow: hidden;
            pointer-events: none;
            background: color-mix(in srgb, var(--color-bv-primary) 20%, transparent);
        }
        .navigation-progress__bar {
            width: 40%;
            height: 100%;
            background: var(--color-bv-primary);
            animation: navigation-progress 1.2s ease-in-out infinite;
        }
        @keyframes navigation-progress {
            from {
                transform: translateX(-100%);
            }
            to {
                transform: translateX(250%);
            }
        }
        @media (prefers-reduced-motion: reduce) {
            .navigation-progress__bar {
                width: 100%;
                animation: none;
                opacity: 0.6;
            }
        }
    `,
})
export class NavigationProgressComponent {
    public readonly shown = signal(false)
    private timer: ReturnType<typeof setTimeout> | undefined

    constructor() {
        const router = inject(Router)
        inject(DestroyRef).onDestroy(() => clearTimeout(this.timer))
        router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
            if (event instanceof NavigationStart) {
                clearTimeout(this.timer)
                if (!router.navigated) return
                this.timer = setTimeout(() => this.shown.set(true), NAVIGATION_PROGRESS_DELAY_MS)
            } else if (
                event instanceof NavigationEnd ||
                event instanceof NavigationCancel ||
                event instanceof NavigationError ||
                event instanceof NavigationSkipped
            ) {
                clearTimeout(this.timer)
                this.shown.set(false)
            }
        })
    }
}
