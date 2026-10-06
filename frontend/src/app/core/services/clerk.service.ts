import { computed, Injectable, signal } from '@angular/core'
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router'
import type { Clerk } from '@clerk/clerk-js'
import { filter, firstValueFrom } from 'rxjs'

type ClerkLoadOptions = NonNullable<Parameters<Clerk['load']>[0]>
type ClerkUiConstructor = NonNullable<ClerkLoadOptions['ui']>['ClerkUI']

import { environment } from '../../../environments/environment'

/**
 * Thin browser-side adapter around Clerk.
 *
 * Clerk is the only identity provider (ADR-0012). This service owns the Clerk
 * lifecycle and session-token access. It deliberately does not decide which
 * local Account row a Clerk user represents; that is a backend responsibility.
 */
@Injectable({ providedIn: 'root' })
export class ClerkService {
    private clerk: Clerk | null = null
    private unsubscribe: (() => void) | null = null

    public readonly isConfigured = signal(environment.clerkPublishableKey.length > 0)
    public readonly isSelfRegistrationEnabled = signal(environment.selfRegistrationEnabled)
    public readonly isInvitationFlow = signal(this.hasInvitationTicket())
    public readonly isInvitationSignIn = signal(this.getInvitationStatus() === 'sign_in')
    public readonly isLoaded = signal(false)
    public readonly initializationError = signal<string | null>(null)
    public readonly isAvailable = computed(() => this.isConfigured() && this.isLoaded() && !this.initializationError())
    public readonly isSignedIn = signal(false)
    public readonly userId = signal<string | null>(null)

    private loaded: Promise<void> | null = null

    /**
     * Starts loading Clerk once the first page has painted, so public pages
     * never wait for it (#92). Anything that needs the session sooner (route
     * guards, API tokens) starts it through whenLoaded().
     */
    public initialize(firstPagePainted: Promise<void>): void {
        void firstPagePainted.then(() => this.whenLoaded())
    }

    /** Starts loading Clerk if nothing has yet. Resolves once it has loaded, or failed to; it never rejects. */
    public whenLoaded(): Promise<void> {
        this.loaded ??= this.load()
        return this.loaded
    }

    private async load(): Promise<void> {
        if (!environment.clerkPublishableKey) {
            // Without a key nobody can sign in. The sign-in page explains the
            // missing configuration instead of failing silently.
            console.error('Clerk is not configured: set CLERK_PUBLISHABLE_KEY.')
            this.isLoaded.set(true)
            return
        }

        try {
            const { Clerk: ClerkConstructor } = await import('@clerk/clerk-js')
            const clerkUiCtor = await this.loadClerkUiScript()
            const clerk = new ClerkConstructor(environment.clerkPublishableKey)
            // Clerk's own UI takes the palette's light-mode primary (docs/design-system.md).
            await clerk.load({ ui: { ClerkUI: clerkUiCtor }, appearance: { variables: { colorPrimary: '#8A2C7A' } } })

            this.clerk = clerk
            this.syncState()
            this.unsubscribe = clerk.addListener(() => this.syncState())
        } catch (error) {
            this.initializationError.set('Clerk could not be initialized')
            // Clerk must not prevent the public application shell from loading.
            // The sign-in page reports the outage instead.
            console.error('Clerk initialization failed.', error)
        } finally {
            this.isLoaded.set(true)
        }
    }

    public async getToken(): Promise<string | null> {
        await this.whenLoaded()
        return (await this.clerk?.session?.getToken()) ?? null
    }

    public openSignIn(): void {
        this.clerk?.openSignIn({ withSignUp: this.isSelfRegistrationEnabled() || this.isInvitationFlow() })
    }

    public openSignUp(): void {
        if (!this.isSelfRegistrationEnabled() && !this.isInvitationFlow()) {
            return
        }
        this.clerk?.openSignUp()
    }

    public async completeInvitationSignUp(username: string, password: string): Promise<void> {
        if (!this.isInvitationFlow() || !this.clerk) {
            throw new Error('Invitation sign-up is unavailable')
        }

        const ticket = this.getInvitationTicket()
        if (!ticket) {
            throw new Error('Invitation ticket is missing')
        }

        const client = this.clerk.client
        if (!client) {
            throw new Error('Clerk client is unavailable')
        }

        if (this.getInvitationStatus() === 'sign_in') {
            const signIn = await client.signIn.create({ strategy: 'ticket', ticket })
            if (signIn.status !== 'complete' || !signIn.createdSessionId) {
                throw new Error('Invitation sign-in is incomplete')
            }

            await this.clerk.setActive({ session: signIn.createdSessionId })
            return
        }

        const signUp = await client.signUp.create({ strategy: 'ticket', ticket, username, password })
        if (signUp.status !== 'complete' || !signUp.createdSessionId) {
            throw new Error('Invitation sign-up is incomplete')
        }

        await this.clerk.setActive({ session: signUp.createdSessionId })
    }

    /**
     * Clear invitation-derived UI state after a stale ticket is abandoned.
     * Angular can reuse the register route when only its query string changes,
     * so the signals cannot rely on component recreation to re-read the URL.
     */
    public clearInvitationState(): void {
        this.isInvitationFlow.set(false)
        this.isInvitationSignIn.set(false)
    }

    public openUserProfile(): void {
        this.clerk?.openUserProfile()
    }

    public async signOut(): Promise<void> {
        await this.clerk?.signOut()
    }

    private syncState(): void {
        const isSignedIn = this.clerk?.isSignedIn ?? false
        this.isSignedIn.set(isSignedIn)
        this.userId.set(isSignedIn ? (this.clerk?.user?.id ?? null) : null)
    }

    public destroy(): void {
        this.unsubscribe?.()
        this.unsubscribe = null
        this.clerk = null
        this.initializationError.set(null)
        this.isSignedIn.set(false)
        this.userId.set(null)
    }

    private loadClerkUiScript(): Promise<ClerkUiConstructor> {
        const existingScript = document.querySelector<HTMLScriptElement>('script[data-clerk-ui-script]')
        const uiConstructor = (globalThis as { __internal_ClerkUICtor?: ClerkUiConstructor }).__internal_ClerkUICtor

        if (uiConstructor) {
            return Promise.resolve(uiConstructor)
        }

        const frontendApi = this.decodeFrontendApi(environment.clerkPublishableKey)
        if (!frontendApi) {
            return Promise.reject(new Error('The Clerk publishable key does not contain a frontend API.'))
        }

        return new Promise((resolve, reject) => {
            const onReady = () => {
                const loadedUiConstructor = (globalThis as { __internal_ClerkUICtor?: ClerkUiConstructor }).__internal_ClerkUICtor
                if (loadedUiConstructor) {
                    resolve(loadedUiConstructor)
                } else {
                    reject(new Error('The Clerk UI script loaded without its UI constructor.'))
                }
            }

            if (existingScript) {
                existingScript.addEventListener('load', onReady, { once: true })
                existingScript.addEventListener('error', () => reject(new Error('The Clerk UI script could not be loaded.')), {
                    once: true,
                })
                return
            }

            const script = document.createElement('script')
            script.async = true
            script.crossOrigin = 'anonymous'
            script.dataset['clerkUiScript'] = 'true'
            script.dataset['clerkPublishableKey'] = environment.clerkPublishableKey
            script.src = `https://${frontendApi}/npm/@clerk/ui@1.30.1/dist/ui.browser.js`
            script.onload = onReady
            script.onerror = () => reject(new Error('The Clerk UI script could not be loaded.'))
            document.head.appendChild(script)
        })
    }

    private decodeFrontendApi(publishableKey: string): string | null {
        const encodedFrontendApi = publishableKey.split('_')[2]
        if (!encodedFrontendApi) {
            return null
        }

        try {
            return globalThis.atob(encodedFrontendApi).slice(0, -1)
        } catch {
            return null
        }
    }

    private hasInvitationTicket(): boolean {
        return Boolean(this.getInvitationTicket())
    }

    private getInvitationTicket(): string | null {
        return typeof globalThis.location !== 'undefined' ? new URLSearchParams(globalThis.location.search).get('__clerk_ticket') : null
    }

    private getInvitationStatus(): string | null {
        return typeof globalThis.location !== 'undefined' ? new URLSearchParams(globalThis.location.search).get('__clerk_status') : null
    }
}

/**
 * Resolves after the first navigation settles and its page has painted. Clerk is about 500 KB:
 * requested any earlier, it competes with the page and Lighthouse counts it against the
 * largest contentful paint.
 */
export async function afterFirstPagePaint(router: Router): Promise<void> {
    await firstValueFrom(
        router.events.pipe(
            filter((event) => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError),
        ),
    )
    // The routed page renders in this task and paints on the next frame. Two frames later that paint has
    // been presented; then wait for the browser to be idle, a second at most.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    await new Promise<void>((resolve) => {
        if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 1000 })
        else setTimeout(resolve, 0)
    })
}
