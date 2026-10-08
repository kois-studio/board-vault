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

    it('links a duplicate proposal to the game already in the catalogue', () => {
        const fixture = render(notification('game_proposal_duplicate', { proposalId: 4, duplicateOfGameId: 40, duplicateOfTitle: 'Azul' }))
        const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement

        expect(link.textContent?.trim()).toBe('Open the existing game')
        expect(link.getAttribute('href')).toBe('/games/40')
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

    it('links game-night notifications to the night, saying what to do there', () => {
        const cases: Array<[string, string]> = [
            ['meeting_scheduled', 'Answer'],
            ['session_started', 'Open the game night'],
            ['session_finished', 'Rate what you played'],
            ['session_cancelled', 'See the game night'],
        ]
        for (const [type, label] of cases) {
            const link = render(notification(type, { account: 1, meeting: 21, group: 7 })).nativeElement.querySelector(
                'a',
            ) as HTMLAnchorElement
            expect(link.textContent?.trim()).toBe(label)
            expect(link.getAttribute('href')).toBe('/sessions/21')
            TestBed.resetTestingModule()
        }
    })

    it('links someone joining to the group', () => {
        const link = render(notification('user_joined_group', { account: 3, group: 7 })).nativeElement.querySelector(
            'a',
        ) as HTMLAnchorElement

        expect(link.textContent?.trim()).toBe('Open the group')
        expect(link.getAttribute('href')).toBe('/groups/7')
    })
})
