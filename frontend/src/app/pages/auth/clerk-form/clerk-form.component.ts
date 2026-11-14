import { Component, DestroyRef, ElementRef, effect, inject, input, viewChild } from '@angular/core'
import { ClerkService } from '../../../core/services/clerk.service'

/**
 * Clerk's sign-in or sign-up form, mounted in the page once Clerk is available (#324). Until then it holds
 * the form's place, so the page doesn't jump when the form appears.
 */
@Component({
    selector: 'app-clerk-form',
    template: `
        <div #host class="min-h-[22rem]" data-testid="clerk-form">
            <div class="space-y-4 py-2" aria-hidden="true">
                <div class="h-4 w-24 rounded bg-bv-surface-2 motion-safe:animate-pulse"></div>
                <div class="h-11 rounded-lg bg-bv-surface-2 motion-safe:animate-pulse"></div>
                <div class="h-11 rounded-lg bg-bv-surface-2 motion-safe:animate-pulse"></div>
            </div>
        </div>
    `,
})
export class ClerkFormComponent {
    private readonly clerkService = inject(ClerkService)

    readonly kind = input.required<'sign-in' | 'sign-up'>()
    private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host')
    private mounted: { kind: 'sign-in' | 'sign-up'; element: HTMLDivElement } | null = null

    constructor() {
        effect(() => {
            const element = this.host().nativeElement
            if (!this.clerkService.isAvailable() || this.mounted) return
            // Clerk replaces the placeholder with its form.
            element.replaceChildren()
            const kind = this.kind()
            if (kind === 'sign-in') this.clerkService.mountSignIn(element)
            else this.clerkService.mountSignUp(element)
            this.mounted = { kind, element }
        })
        inject(DestroyRef).onDestroy(() => {
            if (!this.mounted) return
            if (this.mounted.kind === 'sign-in') this.clerkService.unmountSignIn(this.mounted.element)
            else this.clerkService.unmountSignUp(this.mounted.element)
        })
    }
}
