import { Injectable, computed, signal } from '@angular/core'
import type { Clerk } from '@clerk/clerk-js'

type ClerkLoadOptions = NonNullable<Parameters<Clerk['load']>[0]>
type ClerkUiConstructor = NonNullable<ClerkLoadOptions['ui']>['ClerkUI']

import { environment } from '../../../environments/environment'

/**
 * Thin browser-side adapter around Clerk.
 *
 * This service owns Clerk lifecycle and session-token access. It deliberately
 * does not decide which local Account row a Clerk user represents; that is a
 * backend responsibility and remains a separate migration step.
 */
@Injectable({ providedIn: 'root' })
export class ClerkService {
    private clerk: Clerk | null = null
    private unsubscribe: (() => void) | null = null

    public readonly isConfigured = signal(environment.clerkAuthEnabled && environment.clerkPublishableKey.length > 0)
    public readonly isSelfRegistrationEnabled = signal(environment.selfRegistrationEnabled)
    public readonly isInvitationFlow = signal(this.hasInvitationTicket())
    public readonly isLoaded = signal(false)
    public readonly initializationError = signal<string | null>(null)
    public readonly isAvailable = computed(() => this.isConfigured() && this.isLoaded() && !this.initializationError())
    public readonly isSignedIn = signal(false)
    public readonly userId = signal<string | null>(null)

    public async initialize(): Promise<void> {
        if (!environment.clerkAuthEnabled || !environment.clerkPublishableKey) {
            this.isLoaded.set(true)
            return
        }

        try {
            const { Clerk: ClerkConstructor } = await import('@clerk/clerk-js')
            const clerkUiCtor = await this.loadClerkUiScript()
            const clerk = new ClerkConstructor(environment.clerkPublishableKey)
            await clerk.load({ ui: { ClerkUI: clerkUiCtor } })

            this.clerk = clerk
            this.syncState()
            this.unsubscribe = clerk.addListener(() => this.syncState())
        } catch (error) {
            this.initializationError.set('Clerk could not be initialized')
            // Clerk must not prevent the application shell from loading. The
            // legacy authentication path remains available while the provider
            // is unavailable.
            console.error('Clerk initialization failed.', error)
        } finally {
            this.isLoaded.set(true)
        }
    }

    public async getToken(): Promise<string | null> {
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

    public async beginInvitationSignUp(): Promise<void> {
        if (!this.isInvitationFlow() || !this.clerk) {
            return
        }

        const ticket = this.getInvitationTicket()
        if (!ticket) {
            return
        }

        await this.clerk.client.signUp.create({ strategy: 'ticket', ticket })
        this.clerk.openSignUp()
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
}
