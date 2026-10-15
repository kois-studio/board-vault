import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { AccountMeetType, GameCompleteType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { ToastService } from '../toast/toast.service'
import { NextNightCardComponent } from './next-night-card.component'

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

const night = (overrides: Partial<AccountMeetType> = {}): AccountMeetType => ({
    id: 4,
    groupId: 7,
    createdBy: 1,
    meetDate: inDays(3),
    isConfirmed: false,
    status: 'scheduled',
    timezone: 'Europe/Madrid',
    notes: null,
    myRsvpStatus: 'accepted',
    gamesToBring: [],
    ...overrides,
})

const game = (id: number, title: string) =>
    ({ id, title, imageUrl: '', titleTranslations: { en: title, es: title } }) as unknown as GameCompleteType

const details = {
    attendeeStatuses: [
        { accountId: 1, rsvpStatus: 'accepted', attendanceStatus: 'unknown' },
        { accountId: 2, rsvpStatus: 'accepted', attendanceStatus: 'unknown' },
        { accountId: 3, rsvpStatus: 'pending', attendanceStatus: 'unknown' },
    ],
    participants: [],
    participantStatuses: [],
    plannedGames: [10, 20],
    gameVotes: [{ gameId: 20, accountIds: [1, 2] }],
}

describe('NextNightCardComponent', () => {
    let fixture: ComponentFixture<NextNightCardComponent>
    const getSessionDetailsById = vi.fn()

    async function render(input: AccountMeetType = night(), bringing = '') {
        await TestBed.configureTestingModule({
            imports: [NextNightCardComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: { getSessionDetailsById } },
                { provide: DataService, useValue: { answerSession: vi.fn(), currentUser: signal(null) } },
                { provide: ToastService, useValue: { error: vi.fn() } },
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(NextNightCardComponent)
        fixture.componentRef.setInput('night', input)
        fixture.componentRef.setInput('groupName', 'Friday crew')
        fixture.componentRef.setInput('games', new Map([10, 20].map((id) => [id, game(id, id === 10 ? 'Azul' : 'Wingspan')])))
        fixture.componentRef.setInput('bringing', bringing)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()
        return fixture.nativeElement as HTMLElement
    }
    const text = (element: HTMLElement) => element.textContent?.replace(/\s+/g, ' ') ?? ''

    beforeEach(() => getSessionDetailsById.mockReset().mockReturnValue(of(details)))

    it('says when, where, and who is coming, and links to the night', async () => {
        const element = await render()

        expect(getSessionDetailsById).toHaveBeenCalledWith(4)
        expect(element.textContent).toContain('In 3 days')
        expect(text(element)).toContain('Friday crew · 2 going · 1 hasn’t answered')
        expect(element.querySelector('h2 a')?.getAttribute('href')).toBe('/sessions/4')
    })

    it('shows the shortlist most-voted first, and the game in the lead', async () => {
        const element = await render()

        expect(element.textContent).toContain('Wingspan leads with 2 votes')
        const covers = Array.from(element.querySelectorAll('ul[aria-label="Shortlist"]')[0]?.querySelectorAll('li .sr-only') ?? [])
        expect(covers.map((cover) => cover.textContent)).toEqual(['Wingspan', 'Azul'])
    })

    it('says what you are bringing and lets you answer', async () => {
        const element = await render(night({ myRsvpStatus: 'pending' }), 'Azul')

        expect(text(element)).toContain('You’re bringing: Azul')
        expect(element.querySelector('app-session-answer')?.textContent).toContain('I’m going')
    })

    it('marks a night under way as happening now', async () => {
        const element = await render(night({ status: 'active', meetDate: inDays(0) }))

        expect(element.textContent).toContain('Happening now')
        expect(element.textContent).not.toContain('Next game night')
    })

    it('still shows the night when its details cannot be read', async () => {
        getSessionDetailsById.mockReturnValue(throwError(() => new Error('offline')))
        const element = await render()

        expect(element.textContent).toContain('Friday crew')
        expect(element.textContent).not.toContain('going ·')
        expect(element.querySelector('ul[aria-label="Shortlist"]')).toBeNull()
    })
})
