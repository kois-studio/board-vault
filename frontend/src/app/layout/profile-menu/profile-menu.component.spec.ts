import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import type { UserType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { LoginService } from '../../core/services/login.service'
import { PendingProposalsService } from '../../core/services/pending-proposals.service'
import { ProfileMenuComponent } from './profile-menu.component'

describe('ProfileMenuComponent', () => {
    let fixture: ComponentFixture<ProfileMenuComponent>
    const isAdmin = signal(false)
    const pending = signal<number | null>(null)

    const dataService = {
        currentUser: signal<UserType | null>({
            id: 1,
            email: 'organizer+clerk_test@example.com',
            username: 'organizer',
            displayName: 'Organizer',
            avatar: { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'OR' },
            createdAt: '2026-09-01T10:00:00.000Z',
        }),
        userProposalStats: signal({ totalProposals: 0 }),
    }

    const element = () => fixture.nativeElement as HTMLElement
    const trigger = () => element().querySelector('button[aria-controls="profile-menu"]') as HTMLButtonElement

    function open(): void {
        trigger().click()
        fixture.detectChanges()
    }

    beforeEach(async () => {
        isAdmin.set(false)
        pending.set(null)
        await TestBed.configureTestingModule({
            imports: [ProfileMenuComponent],
            providers: [
                provideRouter([]),
                { provide: DataService, useValue: dataService },
                { provide: LoginService, useValue: { logOut: vi.fn(), isCurrentUserAdmin: isAdmin } },
                { provide: PendingProposalsService, useValue: { count: pending } },
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(ProfileMenuComponent)
        fixture.detectChanges()
    })

    it('is a disclosure: a button with aria-expanded and a plain list, not an ARIA menu', () => {
        expect(trigger().getAttribute('aria-expanded')).toBe('false')
        open()

        expect(trigger().getAttribute('aria-expanded')).toBe('true')
        expect(element().querySelector('[role="menu"], [role="menuitem"]')).toBeNull()
        const labels = Array.from(element().querySelectorAll('#profile-menu li')).map((item) =>
            item.textContent?.replace(/\s+/g, ' ').trim(),
        )
        expect(labels).toEqual(['Settings', expect.stringContaining('Color scheme'), 'My submissions'])
        expect(element().querySelector('#profile-menu input[type="radio"][value="system"]')).not.toBeNull()
    })

    it('closes on Escape and returns focus to the trigger', () => {
        open()
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        fixture.detectChanges()

        expect(element().querySelector('#profile-menu')).toBeNull()
        expect(document.activeElement).toBe(trigger())
    })

    it('closes on a click outside', () => {
        open()
        document.body.click()
        fixture.detectChanges()

        expect(element().querySelector('#profile-menu')).toBeNull()
    })

    it('shows Administration to admins with a neutral count and a dot on the avatar', () => {
        isAdmin.set(true)
        pending.set(3)
        fixture.detectChanges()

        expect(trigger().getAttribute('aria-label')).toBe('Account menu, 3 game proposals waiting')
        open()
        const admin = element().querySelector<HTMLAnchorElement>('a[href="/admin"]')
        expect(admin?.textContent).toContain('Administration')
        expect(admin?.textContent).toContain('3 proposals waiting')
        expect(admin?.innerHTML).not.toContain('danger')
    })
})
