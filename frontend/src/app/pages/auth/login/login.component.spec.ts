import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { ToastService } from '../../../components/toast/toast.service'
import { ClerkService } from '../../../core/services/clerk.service'
import { LandingComponent } from '../../landing/landing.component'
import { LoginComponent } from './login.component'

@Component({ selector: 'app-landing', template: '<h1>Landing</h1>' })
class LandingStubComponent {}

// #343: /login is the landing page with Clerk's own sign-in dialog open over it.
describe('LoginComponent', () => {
    function render({ loaded = true, available = true } = {}) {
        const clerkService = {
            isLoaded: signal(loaded),
            isAvailable: signal(available),
            openSignIn: vi.fn(),
            openSignUp: vi.fn(),
        }
        const toast = { warning: vi.fn() }
        TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [provideRouter([]), { provide: ClerkService, useValue: clerkService }, { provide: ToastService, useValue: toast }],
        }).overrideComponent(LoginComponent, { remove: { imports: [LandingComponent] }, add: { imports: [LandingStubComponent] } })
        const fixture = TestBed.createComponent(LoginComponent)
        fixture.detectChanges()
        return { fixture, clerkService, toast, element: fixture.nativeElement as HTMLElement }
    }

    it('shows the landing page and opens the sign-in dialog over it', () => {
        const { clerkService, element } = render()

        expect(element.textContent).toContain('Landing')
        expect(clerkService.openSignIn).toHaveBeenCalledOnce()
        expect(clerkService.openSignUp).not.toHaveBeenCalled()
    })

    it('waits for Clerk, then opens the dialog once', () => {
        const { fixture, clerkService } = render({ loaded: false, available: false })
        expect(clerkService.openSignIn).not.toHaveBeenCalled()

        clerkService.isLoaded.set(true)
        clerkService.isAvailable.set(true)
        fixture.detectChanges()
        clerkService.isAvailable.set(false)
        clerkService.isAvailable.set(true)
        fixture.detectChanges()

        expect(clerkService.openSignIn).toHaveBeenCalledOnce()
    })

    it('says so when the sign-in service could not be reached', () => {
        const { clerkService, toast } = render({ available: false })

        expect(clerkService.openSignIn).not.toHaveBeenCalled()
        expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('Sign-in isn’t available right now'))
    })
})
