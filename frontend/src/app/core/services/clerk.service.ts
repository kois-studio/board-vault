import { Injectable, signal } from '@angular/core'
import type { Clerk } from '@clerk/clerk-js'

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
    public readonly isLoaded = signal(false)
    public readonly isSignedIn = signal(false)
    public readonly userId = signal<string | null>(null)

    public async initialize(): Promise<void> {
        if (!environment.clerkAuthEnabled || !environment.clerkPublishableKey) {
            this.isLoaded.set(true)
            return
        }

        try {
            const { Clerk: ClerkConstructor } = await import('@clerk/clerk-js')
            const clerk = new ClerkConstructor(environment.clerkPublishableKey)
            await clerk.load()

            this.clerk = clerk
            this.syncState()
            this.unsubscribe = clerk.addListener(() => this.syncState())
        } catch (error) {
            // Clerk must not prevent the application shell from loading. The
            // backend migration is staged, so legacy auth remains available
            // while a Clerk configuration is incomplete.
            console.error('Clerk initialization failed.', error)
        } finally {
            this.isLoaded.set(true)
        }
    }

    public async getToken(): Promise<string | null> {
        return (await this.clerk?.session?.getToken()) ?? null
    }

    public openSignIn(): void {
        this.clerk?.openSignIn()
    }

    public openSignUp(): void {
        this.clerk?.openSignUp()
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
        this.isSignedIn.set(false)
        this.userId.set(null)
    }
}
