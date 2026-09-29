import { ComponentFixture, TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import type { InvitationWithExtraData } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { CardInvitationComponent } from './card-invitation.component'

describe('CardInvitationComponent', () => {
    let fixture: ComponentFixture<CardInvitationComponent>
    let component: CardInvitationComponent
    const dataService = {
        acceptInvitation: jasmine.createSpy('acceptInvitation').and.returnValue(of({ success: true })),
        rejectInvitation: jasmine.createSpy('rejectInvitation').and.returnValue(of({ success: true })),
        retryUserInvitations: jasmine.createSpy('retryUserInvitations'),
    }

    const invitation = {
        id: 12,
        groupId: 7,
        fromAccountId: 1,
        toAccountId: 2,
        sentAt: '2026-09-05T10:00:00.000Z',
        expiresAt: '2026-10-05T10:00:00.000Z',
        fromAccount: {
            id: 1,
            username: 'owner',
            displayName: 'Group owner',
            avatar: { backgroundColor: '#fff', iconName: null, emoji: null, type: 'initials' as const, initials: 'GO' },
        },
        group: { id: 7, name: 'Friday games', createdBy: 1, createdAt: '2026-09-01T10:00:00.000Z' },
    } as InvitationWithExtraData

    beforeEach(async () => {
        dataService.acceptInvitation.calls.reset()
        dataService.rejectInvitation.calls.reset()
        dataService.retryUserInvitations.calls.reset()
        dataService.acceptInvitation.and.returnValue(of({ success: true }))
        dataService.rejectInvitation.and.returnValue(of({ success: true }))
        await TestBed.configureTestingModule({
            imports: [CardInvitationComponent],
            providers: [{ provide: DataService, useValue: dataService }],
        }).compileComponents()

        fixture = TestBed.createComponent(CardInvitationComponent)
        component = fixture.componentInstance
        fixture.componentRef.setInput('invitation', invitation)
        fixture.detectChanges()
    })

    it('asks for confirmation before declining an invitation', () => {
        expect(fixture.nativeElement.textContent).toContain('Decline')
        expect(fixture.nativeElement.textContent).not.toContain('Decline this invitation?')

        const declineButton = fixture.nativeElement.querySelector(
            'button[aria-label="Decline invitation to Friday games"]',
        ) as HTMLButtonElement
        declineButton.click()
        fixture.detectChanges()

        expect(component.isConfirmingDecline).toBeTrue()
        expect(fixture.nativeElement.textContent).toContain('Decline this invitation?')
        expect(dataService.rejectInvitation).not.toHaveBeenCalled()
    })

    it('declines only after the confirmation action', async () => {
        const declineButton = fixture.nativeElement.querySelector(
            'button[aria-label="Decline invitation to Friday games"]',
        ) as HTMLButtonElement
        declineButton.click()
        fixture.detectChanges()

        const confirmButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
            (button as HTMLButtonElement).textContent?.includes('Yes, decline'),
        ) as HTMLButtonElement
        confirmButton.click()
        await fixture.whenStable()

        expect(dataService.rejectInvitation).toHaveBeenCalledWith(invitation.id)
    })

    it('keeps an acceptance failure visible with an invitation refresh action', async () => {
        dataService.acceptInvitation.and.returnValue(throwError(() => new Error('expired')))

        await component.acceptInvitation()
        fixture.detectChanges()

        expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('may have expired')
        const refreshButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
            (button as HTMLButtonElement).textContent?.includes('Refresh invitations'),
        ) as HTMLButtonElement
        refreshButton.click()

        expect(dataService.retryUserInvitations).toHaveBeenCalled()
        expect(component.actionError()).toBeNull()
    })
})
