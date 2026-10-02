import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import type { UserType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { LoginService } from '../../core/services/login.service'
import { ProfileMenuComponent } from './profile-menu.component'

describe('ProfileMenuComponent dialogs', () => {
    let fixture: ComponentFixture<ProfileMenuComponent>

    const dataService = {
        currentUser: signal<UserType | null>({
            id: 1,
            email: 'organizer+clerk_test@example.com',
            username: 'organizer',
            displayName: 'Organizer',
            avatar: { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'OR' },
            createdAt: '2026-09-01T10:00:00.000Z',
        }),
        userInvitations: signal([]),
        userInvitationsLoading: signal(false),
        userInvitationsError: signal(false),
        userNotifications: signal([]),
        userNotificationsLoading: signal(false),
        userNotificationsError: signal(false),
        userProposalStats: signal({ totalProposals: 0 }),
        retryUserInvitations: vi.fn(),
        retryUserNotifications: vi.fn(),
    }

    const openMenuItem = (label: RegExp) => {
        ;(fixture.nativeElement.querySelector('button[aria-label="Open profile menu"]') as HTMLButtonElement).click()
        fixture.detectChanges()

        const item = [...fixture.nativeElement.querySelectorAll('[role="menuitem"]')].find((element: HTMLElement) =>
            label.test(element.textContent ?? ''),
        ) as HTMLElement
        item.click()
        fixture.detectChanges()
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ProfileMenuComponent],
            providers: [
                provideRouter([]),
                { provide: DataService, useValue: dataService },
                { provide: LoginService, useValue: { logOut: vi.fn() } },
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(ProfileMenuComponent)
        fixture.detectChanges()
    })

    it('opens and closes the invitations dialog from the menu', () => {
        openMenuItem(/Group Invitations/)

        expect(fixture.nativeElement.querySelector('#invitations-dialog-title')).not.toBeNull()
        expect(fixture.nativeElement.textContent).toContain('No invitations pending.')

        ;(fixture.nativeElement.querySelector('button[aria-label="Close invitations"]') as HTMLButtonElement).click()
        fixture.detectChanges()

        expect(fixture.nativeElement.querySelector('#invitations-dialog-title')).toBeNull()
    })

    it('opens and closes the notifications dialog from the menu', () => {
        openMenuItem(/Notifications/)

        expect(fixture.nativeElement.querySelector('#notifications-dialog-title')).not.toBeNull()
        expect(fixture.nativeElement.textContent).toContain('No notifications pending.')

        ;(fixture.nativeElement.querySelector('button[aria-label="Close notifications"]') as HTMLButtonElement).click()
        fixture.detectChanges()

        expect(fixture.nativeElement.querySelector('#notifications-dialog-title')).toBeNull()
    })
})
