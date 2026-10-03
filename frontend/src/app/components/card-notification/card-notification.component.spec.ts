import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import type { NotificationType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { CardNotificationComponent } from './card-notification.component'

describe('CardNotificationComponent', () => {
    const notification = (type: string, data?: Record<string, unknown>): NotificationType => ({
        id: 1,
        accountId: 2,
        type,
        message: 'Message',
        createdAt: '2026-10-01T10:00:00.000Z',
        isRead: false,
        data,
    })

    const render = (value: NotificationType) => {
        TestBed.configureTestingModule({
            imports: [CardNotificationComponent],
            providers: [
                provideRouter([]),
                { provide: DataService, useValue: { updateNotification: vi.fn(), deleteNotification: vi.fn() } },
            ],
        })
        const fixture = TestBed.createComponent(CardNotificationComponent)
        fixture.componentRef.setInput('notification', value)
        fixture.detectChanges()
        return fixture
    }

    it('links an approved proposal to the new game', () => {
        const fixture = render(notification('game_proposal_approved', { proposalId: 4, createdGameId: 88 }))
        const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement

        expect(link.textContent?.trim()).toBe('Open the game')
        expect(link.getAttribute('href')).toBe('/games/88')
    })

    it('sends admins to the proposals to review', () => {
        const fixture = render(notification('game_proposal_submitted', { proposalId: 4 }))

        expect((fixture.nativeElement.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe('/admin/proposals')
    })

    it('has no link for an approval without a game, or for other notifications', () => {
        expect(render(notification('game_proposal_approved', { proposalId: 4 })).nativeElement.querySelector('a')).toBeNull()
        TestBed.resetTestingModule()
        expect(render(notification('invitation_accepted')).nativeElement.querySelector('a')).toBeNull()
    })
})
