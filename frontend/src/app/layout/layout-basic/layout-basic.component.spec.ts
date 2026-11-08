import { Component, computed, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'

import { ClerkService } from '../../core/services/clerk.service'
import { LoginService } from '../../core/services/login.service'
import { LayoutBasicComponent } from './layout-basic.component'

@Component({ template: '<h1>New game night</h1>' })
class FocusedPageComponent {}

describe('LayoutBasicComponent', () => {
    async function open(options: { signedIn: boolean; authenticated: boolean }) {
        const isSignedIn = signal(options.signedIn)
        const isAuthenticated = signal(options.authenticated)
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: '', component: LayoutBasicComponent, children: [{ path: 'page', component: FocusedPageComponent }] },
                ]),
                {
                    provide: LoginService,
                    useValue: {
                        isAuthenticated,
                        isClerkAuthHandoffActive: computed(() => isSignedIn() && !isAuthenticated()),
                        clerkAuthHandoffState: signal('linking'),
                        clerkAuthHandoffError: signal(null),
                        isReconnecting: signal(false),
                        retryClerkSession: vi.fn(),
                    },
                },
                { provide: ClerkService, useValue: { isSignedIn, isInvitationFlow: signal(false) } },
            ],
        })
        const harness = await RouterTestingHarness.create('/page')
        return { harness, isAuthenticated }
    }

    it('shows the handoff screen, full height, instead of a blank page while the account is resolved (#239)', async () => {
        const { harness, isAuthenticated } = await open({ signedIn: true, authenticated: false })
        const root = harness.fixture.nativeElement as HTMLElement

        const handoff = root.querySelector('app-auth-handoff main') as HTMLElement
        expect(handoff).not.toBeNull()
        expect(handoff.id).toBe('main-content')
        expect(handoff.classList).toContain('min-h-dvh')
        expect(root.textContent).not.toContain('New game night')

        isAuthenticated.set(true)
        harness.fixture.detectChanges()
        await harness.fixture.whenStable()

        expect(root.querySelector('app-auth-handoff')).toBeNull()
        expect(root.querySelector('main#main-content h1')?.textContent).toBe('New game night')
    })

    it('shows the page when nobody is signing in', async () => {
        const { harness } = await open({ signedIn: false, authenticated: false })
        const root = harness.fixture.nativeElement as HTMLElement

        expect(root.querySelector('app-auth-handoff')).toBeNull()
        expect(root.querySelector('main#main-content h1')?.textContent).toBe('New game night')
    })
})
