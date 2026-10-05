import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import type { NotificationType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { InboxComponent } from './inbox.component'

describe('InboxComponent', () => {
    let fixture: ComponentFixture<InboxComponent>
    const notification = (id: number, isRead: boolean) =>
        ({
            id,
            type: 'member_left',
            message: `Note ${id}`,
            isRead,
            createdAt: '2026-10-01T10:00:00.000Z',
            data: null,
        }) as unknown as NotificationType

    const dataService = {
        userInvitations: signal<Array<unknown>>([]),
        userInvitationsLoading: signal(false),
        userInvitationsError: signal(false),
        userNotifications: signal<Array<NotificationType>>([]),
        userNotificationsLoading: signal(false),
        userNotificationsError: signal(false),
        markAllNotificationsRead: vi.fn(),
        retryUserInvitations: vi.fn(),
        retryUserNotifications: vi.fn(),
        updateNotification: vi.fn(),
        deleteNotification: vi.fn(),
    }

    const element = () => fixture.nativeElement as HTMLElement
    const trigger = () => element().querySelector('button[aria-controls="inbox-panel"]') as HTMLButtonElement

    beforeEach(async () => {
        dataService.userNotifications.set([notification(1, false), notification(2, true), notification(3, false)])
        await TestBed.configureTestingModule({
            imports: [InboxComponent],
            providers: [provideRouter([]), { provide: DataService, useValue: dataService }],
        }).compileComponents()

        fixture = TestBed.createComponent(InboxComponent)
        fixture.detectChanges()
    })

    it('counts unread notifications and pending invitations together', () => {
        expect(trigger().getAttribute('aria-label')).toBe('Inbox, 2 new')

        dataService.userInvitations.set([{}])
        dataService.userNotifications.set([notification(1, false), notification(2, true), notification(3, false)])
        fixture.detectChanges()
        expect(trigger().getAttribute('aria-label')).toBe('Inbox, 3 new')
    })

    it('opens a panel with both lists and marks everything read', () => {
        dataService.userInvitations.set([])
        fixture.detectChanges()
        trigger().click()
        fixture.detectChanges()

        expect(trigger().getAttribute('aria-expanded')).toBe('true')
        expect(element().querySelector('#inbox-panel')?.textContent).toContain('No invitations waiting.')
        expect(element().querySelectorAll('app-card-notification')).toHaveLength(3)

        Array.from(element().querySelectorAll('button'))
            .find((button) => button.textContent?.includes('Mark all read'))
            ?.click()
        expect(dataService.markAllNotificationsRead).toHaveBeenCalled()
    })

    it('closes on Escape and returns focus to the bell', () => {
        trigger().click()
        fixture.detectChanges()
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        fixture.detectChanges()

        expect(element().querySelector('#inbox-panel')).toBeNull()
        expect(document.activeElement).toBe(trigger())
    })
})
