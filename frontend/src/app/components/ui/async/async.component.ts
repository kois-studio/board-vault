import { NgTemplateOutlet } from '@angular/common'
import {
    booleanAttribute,
    Component,
    computed,
    contentChild,
    DestroyRef,
    Directive,
    effect,
    inject,
    input,
    NgZone,
    output,
    signal,
    TemplateRef,
    untracked,
} from '@angular/core'
import type { ResourceState } from '../../../core/async/resource-state'
import { ButtonComponent } from '../button/button.component'

/** Nothing shown before this, so an answer that comes quickly never flashes a skeleton. */
export const SKELETON_DELAY_MS = 150
/** Once shown, the skeleton stays at least this long, so it never blinks. */
export const SKELETON_MIN_MS = 300
/** Still loading after this: say so, and offer to try again. */
export const SLOW_AFTER_MS = 8000

/** What `<app-async>` shows; `refreshing` data shows as `ready`, with a hint. */
type AsyncView = 'waiting' | 'skeleton' | 'error' | 'empty' | 'ready'

/** The section's own placeholder: `<ng-template appAsyncLoading>`. A plain block when there is none. */
@Directive({ selector: 'ng-template[appAsyncLoading]' })
export class AsyncLoadingDirective {
    readonly template = inject(TemplateRef)
}

/** What the section says once it has loaded with nothing in it: `<ng-template appAsyncEmpty>`. Nothing when there is none. */
@Directive({ selector: 'ng-template[appAsyncEmpty]' })
export class AsyncEmptyDirective {
    readonly template = inject(TemplateRef)
}

/** A failure in the section's own words: `<ng-template appAsyncError>`. A message and Retry when there is none. */
@Directive({ selector: 'ng-template[appAsyncError]' })
export class AsyncErrorDirective {
    readonly template = inject(TemplateRef)
}

/** The loaded content: `<ng-template appAsyncReady let-items>`, which receives the value. */
@Directive({ selector: 'ng-template[appAsyncReady]' })
export class AsyncReadyDirective<T> {
    readonly template = inject<TemplateRef<{ $implicit: T }>>(TemplateRef)
    /** Optional: `[appAsyncReady]="state()"` types `let-value` in the template from the state. */
    readonly appAsyncReady = input<ResourceState<T> | undefined, ResourceState<T> | '' | undefined>(undefined, {
        transform: (state) => state || undefined,
    })

    static ngTemplateContextGuard<T>(_directive: AsyncReadyDirective<T>, _context: unknown): _context is { $implicit: T } {
        return true
    }
}

/** Empty when it is an empty list or nothing at all; anything else has something to show. */
export function isEmptyValue(value: unknown): boolean {
    return value === null || value === undefined || (Array.isArray(value) && value.length === 0)
}

/**
 * Renders a piece of data through its one state (#256): a skeleton while it loads, a failure with Retry,
 * the empty state only after a successful load, or the content. See docs/design-system.md#shared-controls.
 *
 * - Nothing for the first 150 ms of a load, then the skeleton for at least 300 ms: no flash either way.
 * - When something is shown already, a reload keeps it, with a small "Refreshing…" hint.
 * - Still loading after 8 s: "This is taking longer than usual…" and Retry.
 * - A failed reload keeps what loaded before, with a short note and Retry.
 * - `aria-busy` while a load is on its way.
 */
@Component({
    selector: 'app-async',
    imports: [NgTemplateOutlet, ButtonComponent],
    host: { class: 'block', '[attr.aria-busy]': 'busy() ? "true" : null' },
    template: `
        @switch (view()) {
            @case ('waiting') {
                @if (holdSpace()) {
                    <!-- Unseen, so nothing flashes, but in its place, so nothing below moves when it shows (#260). -->
                    <div class="invisible" aria-hidden="true" data-async="holding">
                        @if (loadingTemplate(); as loading) {
                            <ng-container [ngTemplateOutlet]="loading.template" />
                        } @else {
                            <div class="h-24"></div>
                        }
                    </div>
                }
            }
            @case ('skeleton') {
                <div role="status">
                    <span class="sr-only">{{ loadingLabel() || defaultLoadingLabel }}</span>
                    <div aria-hidden="true">
                        @if (loadingTemplate(); as loading) {
                            <ng-container [ngTemplateOutlet]="loading.template" />
                        } @else {
                            <div class="h-24 rounded-2xl bg-bv-surface-2 motion-safe:animate-pulse"></div>
                        }
                    </div>
                </div>
                @if (slow()) {
                    <p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-secondary" role="status" data-async="slow">
                        <ng-container i18n="Shown under a placeholder when something has been loading for several seconds">This is taking longer than usual…</ng-container>
                        <button appButton variant="secondary" size="small" type="button" (click)="tryAgain()" i18n="Button under an error">Retry</button>
                    </p>
                }
            }
            @case ('error') {
                @if (errorTemplate(); as failure) {
                    <ng-container [ngTemplateOutlet]="failure.template" />
                } @else {
                    <div class="rounded-2xl border border-bv-warning/30 bg-bv-warning/10 p-5 text-sm" role="alert" data-async="error">
                        <p>{{ errorMessage() || defaultErrorMessage }}</p>
                        <button appButton variant="secondary" size="small" type="button" class="mt-3" (click)="tryAgain()" i18n="Button under an error">Retry</button>
                    </div>
                }
            }
            @case ('empty') {
                @if (emptyTemplate(); as empty) {
                    <ng-container [ngTemplateOutlet]="empty.template" />
                }
            }
            @case ('ready') {
                @if (readyTemplate(); as ready) {
                    <ng-container [ngTemplateOutlet]="ready.template" [ngTemplateOutletContext]="{ $implicit: state().value }" />
                }
            }
        }
        @if (view() === 'ready' || view() === 'empty') {
            @if (state().status === 'refreshing') {
                <p class="mt-2 text-xs text-bv-text-muted" role="status" data-async="refreshing" i18n="Small hint under something already shown while a newer copy loads">Refreshing…</p>
            } @else if (state().status === 'error') {
                <p class="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-bv-text-muted" role="status" data-async="stale">
                    <ng-container i18n="Small note under something already shown when loading a newer copy failed">This may be out of date.</ng-container>
                    <button type="button" class="font-semibold text-bv-primary underline" (click)="tryAgain()" i18n="Button under an error">Retry</button>
                </p>
            }
        }
    `,
})
export class AsyncComponent<T> {
    readonly state = input.required<ResourceState<T>>()
    /** Whether a loaded value counts as empty. By default: an empty list, or nothing. */
    readonly isEmpty = input<(value: T) => boolean>(isEmptyValue)
    /** Read to screen readers while the skeleton shows, such as "Loading your groups". */
    readonly loadingLabel = input<string>('')
    /** Says what failed when there is no error template, such as "Your groups could not be loaded." */
    readonly errorMessage = input<string>('')
    /**
     * Holds the skeleton's space, unseen, in the first 150 ms too, for a section in the flow of a page, so what
     * follows it does not move twice (#260).
     */
    readonly holdSpace = input(false, { transform: booleanAttribute })
    /** Retry was pressed: load it again. */
    readonly retry = output<void>()

    readonly loadingTemplate = contentChild(AsyncLoadingDirective)
    readonly emptyTemplate = contentChild(AsyncEmptyDirective)
    readonly errorTemplate = contentChild(AsyncErrorDirective)
    readonly readyTemplate = contentChild(AsyncReadyDirective)

    readonly defaultLoadingLabel = $localize`:Read by screen readers while a section of a page loads:Loading…`
    readonly defaultErrorMessage = $localize`:Shown in place of a section of a page that could not load:This could not be loaded.`

    /** The placeholder phase of a load with nothing to show: before it, during it, or done. */
    private readonly phase = signal<'waiting' | 'skeleton' | 'done'>('done')
    readonly slow = signal(false)

    private skeletonShownAt = 0
    private readonly zone = inject(NgZone)
    private readonly timers = new Set<ReturnType<typeof setTimeout>>()

    readonly busy = computed(() => {
        const status = this.state().status
        return status === 'loading' || status === 'refreshing'
    })

    readonly view = computed<AsyncView>(() => {
        const phase = this.phase()
        if (phase !== 'done') return phase
        const state = this.state()
        if (state.status === 'loading') return 'waiting'
        const empty = state.value === undefined || this.isEmpty()(state.value)
        // A failure with nothing worth showing is a failure, never an empty state.
        if (state.status === 'error' && empty) return 'error'
        return empty ? 'empty' : 'ready'
    })

    constructor() {
        inject(DestroyRef).onDestroy(() => this.clearTimers())

        effect(() => {
            const loading = this.state().status === 'loading'
            untracked(() => (loading ? this.startPlaceholder() : this.endPlaceholder()))
        })
    }

    tryAgain(): void {
        this.slow.set(false)
        if (this.phase() === 'skeleton') this.later(() => this.slow.set(true), SLOW_AFTER_MS)
        this.retry.emit()
    }

    private startPlaceholder(): void {
        // Loading again before the skeleton went away: keep it up, and count towards "slow" from now.
        if (this.phase() === 'skeleton') {
            this.clearTimers()
            this.slow.set(false)
            this.later(() => this.slow.set(true), SLOW_AFTER_MS)
            return
        }
        if (this.phase() === 'waiting') return
        this.clearTimers()
        this.phase.set('waiting')
        this.later(() => {
            this.phase.set('skeleton')
            this.skeletonShownAt = Date.now()
            this.later(() => this.slow.set(true), SLOW_AFTER_MS - SKELETON_DELAY_MS)
        }, SKELETON_DELAY_MS)
    }

    private endPlaceholder(): void {
        if (this.phase() === 'done') return
        this.clearTimers()
        this.slow.set(false)
        const remaining = this.phase() === 'skeleton' ? SKELETON_MIN_MS - (Date.now() - this.skeletonShownAt) : 0
        if (remaining > 0) this.later(() => this.phase.set('done'), remaining)
        else this.phase.set('done')
    }

    /**
     * Outside Angular's zone, so a placeholder's timers never keep the app from being stable (tests' whenStable,
     * the service worker's registration); the signals they set still update the view.
     */
    private later(run: () => void, ms: number): void {
        const timer = this.zone.runOutsideAngular(() =>
            setTimeout(() => {
                this.timers.delete(timer)
                run()
            }, ms),
        )
        this.timers.add(timer)
    }

    private clearTimers(): void {
        for (const timer of this.timers) clearTimeout(timer)
        this.timers.clear()
    }
}

/** Everything a template needs to use `<app-async>`. */
export const ASYNC = [AsyncComponent, AsyncLoadingDirective, AsyncEmptyDirective, AsyncErrorDirective, AsyncReadyDirective] as const
