import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import type { UserType } from '../../../api/api.types'
import { ClerkService } from '../../../core/services/clerk.service'
import { DataService } from '../../../core/services/data.service'
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
    const dataService = { currentUser: signal<UserType | null>(null) }

    const text = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`)?.textContent?.trim()

    beforeEach(async () => {
        dataService.currentUser.set(structuredClone(currentUser))
        clerkService.isAvailable.set(true)
        clerkService.username.set(null)
        clerkService.primaryEmail.set(null)
        clerkService.openUserProfile.mockClear()

        await TestBed.configureTestingModule({
            imports: [SettingsAccountComponent],
            providers: [
                { provide: ClerkService, useValue: clerkService },
                { provide: DataService, useValue: dataService },
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

    it('shows a username changed in Clerk everywhere before the webhook lands', () => {
        clerkService.username.set('organizer2')
        fixture.detectChanges()

        expect(dataService.currentUser()?.username).toBe('organizer2')
    })

    it('opens the Clerk panel to manage sign-in', () => {
        const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((candidate) =>
            candidate.textContent?.includes('Manage sign-in'),
        )
        button?.click()

        expect(clerkService.openUserProfile).toHaveBeenCalledTimes(1)
    })

    it('explains that deletion is not available, with no delete control', () => {
        const element: HTMLElement = fixture.nativeElement

        expect(element.textContent).toContain("You can't delete your account yourself yet")
        expect(Array.from(element.querySelectorAll('button')).some((button) => /delete/i.test(button.textContent ?? ''))).toBe(false)
    })

    it('says when Clerk is not available', () => {
        clerkService.isAvailable.set(false)
        fixture.detectChanges()

        expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent).toContain('unavailable')
    })
})
