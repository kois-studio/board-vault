import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { Api } from '../../../api/api'
import type { ClerkSyncResultType, UserType } from '../../../api/api.types'
import { ClerkService } from '../../../core/services/clerk.service'
import { DataService } from '../../../core/services/data.service'
import { LoginService } from '../../../core/services/login.service'
import { SettingsAccountComponent } from './settings-account.component'

describe('SettingsAccountComponent', () => {
    let fixture: ComponentFixture<SettingsAccountComponent>

    const currentUser: UserType = {
        id: 1,
        email: 'organizer+clerk_test@example.com',
        username: 'organizer',
        displayName: 'Organizer',
        avatar: { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'OR' },
        createdAt: '2026-09-01T10:00:00.000Z',
    }

    const clerkService = {
        isAvailable: signal(true),
        username: signal<string | null>(null),
        primaryEmail: signal<string | null>(null),
        openUserProfile: vi.fn(),
    }
    const dataService = { currentUser: signal<UserType | null>(null), syncFromClerk: vi.fn<() => Promise<ClerkSyncResultType | null>>() }
    const api = { deleteAccount: vi.fn() }
    const loginService = { leaveAfterAccountDeletion: vi.fn().mockResolvedValue(undefined) }

    const text = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`)?.textContent?.trim()

    beforeEach(async () => {
        dataService.currentUser.set(structuredClone(currentUser))
        dataService.syncFromClerk.mockReset().mockResolvedValue({ username: 'unchanged', email: 'unchanged' })
        clerkService.isAvailable.set(true)
        clerkService.username.set(null)
        clerkService.primaryEmail.set(null)
        clerkService.openUserProfile.mockClear()
        api.deleteAccount.mockReset().mockReturnValue(of(undefined))
        loginService.leaveAfterAccountDeletion.mockClear()

        await TestBed.configureTestingModule({
            imports: [SettingsAccountComponent],
            providers: [
                { provide: ClerkService, useValue: clerkService },
                { provide: DataService, useValue: dataService },
                { provide: Api, useValue: api },
                { provide: LoginService, useValue: loginService },
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(SettingsAccountComponent)
        fixture.detectChanges()
    })

    it('falls back to the account copy until Clerk has loaded', () => {
        expect(text('account-username')).toBe('organizer')
        expect(text('account-email')).toBe('organizer+clerk_test@example.com')
    })

    it('shows the values Clerk holds', () => {
        clerkService.username.set('organizer2')
        clerkService.primaryEmail.set('new+clerk_test@example.com')
        fixture.detectChanges()

        expect(text('account-username')).toBe('organizer2')
        expect(text('account-email')).toBe('new+clerk_test@example.com')
    })

    describe('a username changed in Clerk', () => {
        const settle = async () => {
            await fixture.whenStable()
            fixture.detectChanges()
        }

        it('copies it to the account right away, without inventing it locally', async () => {
            dataService.syncFromClerk.mockImplementation(async () => {
                dataService.currentUser.set({ ...structuredClone(currentUser), username: 'organizer2' })
                return { username: 'updated', email: 'unchanged' }
            })

            clerkService.username.set('organizer2')
            fixture.detectChanges()
            await settle()

            expect(dataService.syncFromClerk).toHaveBeenCalledTimes(1)
            expect(dataService.currentUser()?.username).toBe('organizer2')
            expect(text('account-username-behind')).toBeUndefined()
        })

        it('says when another account already has the username', async () => {
            dataService.syncFromClerk.mockResolvedValue({ username: 'taken', email: 'unchanged' })

            clerkService.username.set('taken-name')
            fixture.detectChanges()
            await settle()

            expect(dataService.currentUser()?.username).toBe('organizer')
            expect(text('account-username-behind')).toContain('taken-name is already taken in Board Vault')
            expect(text('account-username-behind')).toContain('still see you as organizer')
        })

        it('says when the copy failed, and asks to reload', async () => {
            dataService.syncFromClerk.mockResolvedValue(null)

            clerkService.username.set('organizer2')
            fixture.detectChanges()
            await settle()

            expect(text('account-username-behind')).toContain('could not be saved yet')
        })

        it('copies nothing when Clerk and the account agree', async () => {
            clerkService.username.set('organizer')
            fixture.detectChanges()
            await settle()

            expect(dataService.syncFromClerk).not.toHaveBeenCalled()
        })

        it('copies each new username once', async () => {
            clerkService.username.set('organizer2')
            fixture.detectChanges()
            await settle()
            fixture.detectChanges()
            await settle()

            expect(dataService.syncFromClerk).toHaveBeenCalledTimes(1)
        })
    })

    it('opens the Clerk panel to manage sign-in', () => {
        const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((candidate) =>
            candidate.textContent?.includes('Manage sign-in'),
        )
        button?.click()

        expect(clerkService.openUserProfile).toHaveBeenCalledTimes(1)
    })

    const element = () => fixture.nativeElement as HTMLElement
    const byTestId = (testId: string) => element().querySelector<HTMLElement>(`[data-testid="${testId}"]`)
    const typeConfirmation = (value: string) => {
        const input = byTestId('delete-account-confirmation') as HTMLInputElement
        input.value = value
        input.dispatchEvent(new Event('input'))
        fixture.detectChanges()
    }

    it('explains what deleting keeps and removes, and asks for the username before deleting', () => {
        expect(element().textContent).toContain('Deleted account')
        expect(byTestId('delete-account-confirmation')).toBeNull()

        byTestId('delete-account')?.click()
        fixture.detectChanges()

        const confirm = byTestId('confirm-delete-account') as HTMLButtonElement
        expect(confirm.disabled).toBe(true)

        typeConfirmation('someone-else')
        expect(confirm.disabled).toBe(true)

        typeConfirmation('Organizer')
        expect(confirm.disabled).toBe(false)
        expect(api.deleteAccount).not.toHaveBeenCalled()
    })

    it('deletes the account and signs out', async () => {
        byTestId('delete-account')?.click()
        fixture.detectChanges()
        typeConfirmation('organizer')

        await fixture.componentInstance.deleteAccount()

        expect(api.deleteAccount).toHaveBeenCalledTimes(1)
        expect(loginService.leaveAfterAccountDeletion).toHaveBeenCalledTimes(1)
    })

    it('says so when the deletion fails, and stays signed in', async () => {
        api.deleteAccount.mockReturnValue(throwError(() => new Error('offline')))
        byTestId('delete-account')?.click()
        fixture.detectChanges()
        typeConfirmation('organizer')

        await fixture.componentInstance.deleteAccount()
        fixture.detectChanges()

        expect(element().querySelector('[role="alert"]')?.textContent).toContain('could not be deleted')
        expect(loginService.leaveAfterAccountDeletion).not.toHaveBeenCalled()
    })

    it('says when Clerk is not available', () => {
        clerkService.isAvailable.set(false)
        fixture.detectChanges()

        expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent).toContain('unavailable')
    })
})
