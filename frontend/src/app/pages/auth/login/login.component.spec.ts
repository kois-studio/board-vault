import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { ClerkService } from '../../../core/services/clerk.service'
import { LoginComponent } from './login.component'

describe('LoginComponent', () => {
    function render({ configured = true, loaded = true, available = true } = {}) {
        const clerkService = {
            isConfigured: signal(configured),
            isLoaded: signal(loaded),
            isAvailable: signal(available),
            mountSignIn: vi.fn(),
            unmountSignIn: vi.fn(),
        }
        TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [provideRouter([]), { provide: ClerkService, useValue: clerkService }],
        })
        const fixture = TestBed.createComponent(LoginComponent)
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement
        return { fixture, clerkService, element, text: element.textContent ?? '' }
    }

    // #324: a heading and Clerk's form on the page, not a box of text with a button that opens it.
    it('puts the sign-in form on the page, under a heading, and no button to open it', () => {
        const { clerkService, element, text } = render()

        expect(element.querySelector('h1')?.textContent?.trim()).toBe('Sign in to Board Vault')
        expect(clerkService.mountSignIn).toHaveBeenCalledWith(element.querySelector('[data-testid="clerk-form"]'))
        expect(element.querySelector('button')).toBeNull()
        // Forgot password and Sign up are Clerk's own links, inside the form.
        expect(text).not.toMatch(/secure sign-in|Forgot your password|New here/)
    })

    it("holds the form's place while Clerk loads, then mounts it", () => {
        const { fixture, clerkService, element } = render({ loaded: false, available: false })

        expect(element.querySelector('[data-testid="clerk-form"]')).not.toBeNull()
        expect(clerkService.mountSignIn).not.toHaveBeenCalled()

        clerkService.isLoaded.set(true)
        clerkService.isAvailable.set(true)
        fixture.detectChanges()
        expect(clerkService.mountSignIn).toHaveBeenCalledOnce()
    })

    it('says so when the sign-in service could not be reached', () => {
        const { clerkService, text } = render({ available: false })

        expect(text).toContain('The secure sign-in service could not be reached')
        expect(clerkService.mountSignIn).not.toHaveBeenCalled()
    })

    it('takes the form away on leaving the page', () => {
        const { fixture, clerkService, element } = render()
        const host = element.querySelector('[data-testid="clerk-form"]')

        fixture.destroy()

        expect(clerkService.unmountSignIn).toHaveBeenCalledWith(host)
    })
})
