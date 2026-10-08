import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import type { AccountMeetType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { ToastService } from '../toast/toast.service'
import { SessionAnswerComponent } from './session-answer.component'

describe('SessionAnswerComponent', () => {
    const session: AccountMeetType = {
        id: 21,
        groupId: 7,
        createdBy: 1,
        meetDate: '2026-10-09T17:00:00.000Z',
        isConfirmed: false,
        status: 'scheduled',
        timezone: 'Europe/Madrid',
        notes: null,
        myRsvpStatus: 'pending',
        gamesToBring: [],
    }

    const setup = (
        overrides: Partial<AccountMeetType> = {},
        answer = vi.fn().mockReturnValue(of({ sessionId: 21, rsvpStatus: 'accepted' })),
    ) => {
        const toast = { error: vi.fn() }
        TestBed.configureTestingModule({
            providers: [
                { provide: DataService, useValue: { answerSession: answer } },
                { provide: ToastService, useValue: toast },
            ],
        })
        const fixture = TestBed.createComponent(SessionAnswerComponent)
        fixture.componentRef.setInput('session', { ...session, ...overrides })
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement
        const button = (name: string) => [...element.querySelectorAll('button')].find((candidate) => candidate.textContent?.includes(name))
        return { fixture, element, button, answer, toast }
    }

    it('asks a pending invitee and saves the answer', async () => {
        const { element, button, answer } = setup()

        expect(element.textContent).toContain('Waiting for your answer')
        button('I’m going')?.click()
        await Promise.resolve()

        expect(answer).toHaveBeenCalledWith(21, 'accepted')
    })

    it('shows the answer given and does not send it twice', () => {
        const { element, button, answer } = setup({ myRsvpStatus: 'declined' })

        expect(element.textContent).toContain('You can’t make it')
        expect(button('Can’t make it')?.getAttribute('aria-pressed')).toBe('true')
        button('Can’t make it')?.click()
        expect(answer).not.toHaveBeenCalled()
    })

    it('stays empty for people not invited and for nights that are over', () => {
        expect(setup({ myRsvpStatus: null }).element.querySelector('button')).toBeNull()
        TestBed.resetTestingModule()
        expect(setup({ status: 'completed' }).element.querySelector('button')).toBeNull()
    })

    it('says so when the answer could not be saved', async () => {
        const { button, toast } = setup({}, vi.fn().mockReturnValue(throwError(() => new Error('offline'))))

        button('Can’t make it')?.click()
        await Promise.resolve()
        await Promise.resolve()

        expect(toast.error).toHaveBeenCalledWith('Your answer could not be saved. Try again.')
    })
})
