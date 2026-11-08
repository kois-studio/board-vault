import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router'
import { firstValueFrom, Observable, of } from 'rxjs'
import { ToastService } from '../../components/toast/toast.service'
import { LogService } from '../services/log.service'
import type { ClerkAuthHandoffState } from '../services/login.service'
import { LoginService } from '../services/login.service'
import { AdminGuard } from './admin.guard'

describe('AdminGuard before the session is confirmed', () => {
    const run = (handoffState: ClerkAuthHandoffState) => {
        const navigate = vi.fn().mockResolvedValue(true)
        const toast = { error: vi.fn(), info: vi.fn() }
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: LoginService,
                    useValue: {
                        isAuthenticated: signal(false),
                        isCurrentUserAdmin: signal(false),
                        clerkAuthHandoffState: signal(handoffState),
                        verifySession: () => of(false),
                    },
                },
                { provide: Router, useValue: { navigate } },
                { provide: ToastService, useValue: toast },
                { provide: LogService, useValue: { log: vi.fn(), warn: vi.fn() } },
            ],
        })
        const result = TestBed.runInInjectionContext(() =>
            AdminGuard({} as ActivatedRouteSnapshot, { url: '/admin/games' } as RouterStateSnapshot),
        ) as Observable<boolean>
        return { result, navigate, toast }
    }

    it('does not ask someone to sign in when Board Vault could not be reached', async () => {
        const { result, navigate, toast } = run('unavailable')

        expect(await firstValueFrom(result)).toBe(false)
        expect(toast.info).not.toHaveBeenCalled()
        expect(navigate).toHaveBeenCalledWith(['/dashboard'])
    })

    it('still asks to sign in when there is no usable session', async () => {
        const { result, navigate, toast } = run('error')

        expect(await firstValueFrom(result)).toBe(false)
        expect(toast.info).toHaveBeenCalledWith('Please log in with admin credentials to access this area.')
        expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/admin/games' } })
    })
})
