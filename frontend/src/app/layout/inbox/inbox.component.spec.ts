import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import type { NotificationType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { INBOX_CHECK_MS, InboxComponent } from './inbox.component'

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
        refreshSharedActivity: vi.fn(),
        refreshInbox: vi.fn(),
        inboxArrivals: signal(0),
    }

    const element = () => fixture.nativeElement as HTMLElement
    const trigger = () => element().querySelector('button[aria-expanded]') as HTMLButtonElement

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

    it('names the bell for one new thing, and plainly when nothing is new', () => {
        dataService.userInvitations.set([])
        dataService.userNotifications.set([notification(1, false), notification(2, true)])
        fixture.detectChanges()
        expect(trigger().getAttribute('aria-label')).toBe('Inbox, 1 new')

        dataService.userNotifications.set([notification(2, true)])
        fixture.detectChanges()
        expect(trigger().getAttribute('aria-label')).toBe('Inbox')
    })

    it('opens a panel with both lists and marks everything read', () => {
        dataService.userInvitations.set([])
        fixture.detectChanges()
        trigger().click()
        fixture.detectChanges()

        expect(trigger().getAttribute('aria-expanded')).toBe('true')
        expect(trigger().getAttribute('aria-controls')).toBe('inbox-panel')
        // Opening always looks again, so what arrived a moment ago shows.
        expect(dataService.refreshInbox).toHaveBeenCalled()
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

    it('looks for new activity when the app comes back into view', () => {
        dataService.refreshSharedActivity.mockClear()
        document.dispatchEvent(new Event('visibilitychange'))

        expect(dataService.refreshSharedActivity).toHaveBeenCalledTimes(document.visibilityState === 'visible' ? 1 : 0)
    })

    it('points at the panel only while it is open', () => {
        expect(trigger().hasAttribute('aria-controls')).toBe(false)
    })

    it('looks again every minute while the page is in view, and stops when it goes', () => {
        vi.useFakeTimers()
        try {
            TestBed.resetTestingModule()
            TestBed.configureTestingModule({
                imports: [InboxComponent],
                providers: [provideRouter([]), { provide: DataService, useValue: dataService }],
            })
            const timed = TestBed.createComponent(InboxComponent)
            timed.detectChanges()
            dataService.refreshInbox.mockClear()

            vi.advanceTimersByTime(INBOX_CHECK_MS * 3)
            expect(dataService.refreshInbox).toHaveBeenCalledTimes(document.visibilityState === 'visible' ? 3 : 0)

            timed.destroy()
            dataService.refreshInbox.mockClear()
            vi.advanceTimersByTime(INBOX_CHECK_MS * 3)
            expect(dataService.refreshInbox).not.toHaveBeenCalled()
        } finally {
            vi.useRealTimers()
        }
    })

    it('tells screen readers when a look at the inbox brings something new, never for the first load', () => {
        const status = () => element().querySelector('[role="status"][aria-live="polite"]')?.textContent?.trim()
        // Loaded with two unread: nothing is announced.
        expect(status()).toBe('')

        dataService.userNotifications.set([notification(1, false), notification(2, true), notification(3, false), notification(4, false)])
        dataService.inboxArrivals.update((count) => count + 1)
        fixture.detectChanges()
        expect(status()).toBe('Inbox: 3 new')

        dataService.userNotifications.set([notification(1, false), notification(2, true)])
        dataService.inboxArrivals.update((count) => count + 1)
        fixture.detectChanges()
        expect(status()).toBe('Inbox: 1 new')
    })
})
