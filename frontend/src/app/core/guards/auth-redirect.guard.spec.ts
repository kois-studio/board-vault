import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'

import { ClerkService } from '../services/clerk.service'
import { LoginService } from '../services/login.service'
import { GuestOnlyGuard } from './auth-redirect.guard'

describe('GuestOnlyGuard', () => {
    function run(options: { authenticated: boolean; signedIn: boolean }) {
        const router = { navigate: vi.fn().mockName('navigate') }
        const whenLoaded = vi
            .fn()
            .mockName('whenLoaded')
            .mockReturnValue(new Promise(() => {}))
        TestBed.configureTestingModule({
            providers: [
                { provide: Router, useValue: router },
                { provide: LoginService, useValue: { isAuthenticated: signal(options.authenticated) } },
                { provide: ClerkService, useValue: { isSignedIn: signal(options.signedIn), whenLoaded } },
            ],
        })

        return { router, whenLoaded, allowed: TestBed.inject(GuestOnlyGuard).canActivate() }
    }

    it('lets a visitor in at once, without waiting for Clerk', () => {
        const { router, whenLoaded, allowed } = run({ authenticated: false, signedIn: false })

        expect(allowed).toBe(true)
        expect(whenLoaded).not.toHaveBeenCalled()
        expect(router.navigate).not.toHaveBeenCalled()
    })

    it('sends a signed-in user to the dashboard', () => {
        const { router, allowed } = run({ authenticated: true, signedIn: true })

        expect(allowed).toBe(false)
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard'])
    })
})
