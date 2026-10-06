import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { DashboardPageComponent } from './dashboard-page.component'

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

function meet(id: number, groupId: number, days: number, status = 'scheduled') {
    return { id, groupId, createdBy: 1, meetDate: inDays(days), isConfirmed: false, status, timezone: 'Europe/Madrid', notes: null }
}

async function renderHome(overrides: Record<string, unknown> = {}) {
    const dataService = {
        currentUser: signal({ id: 1, username: 'dawichi', displayName: 'David' }),
        userGroups: signal([]),
        userGroupsError: signal(false),
        userMeets: signal([]),
        userMeetsError: signal(false),
        userHistory: signal([]),
        userGames: signal([]),
        userInvitations: signal([]),
        userInvitationsError: signal(false),
        userInvitationsLoading: signal(false),
        invitationsGroupIndex: signal({}),
        ...overrides,
    }

    await TestBed.configureTestingModule({
        imports: [DashboardPageComponent],
        providers: [
            { provide: DataService, useValue: dataService },
            {
                provide: LoadingService,
                useValue: {
                    loadingStatesIndex: signal({
                        [LOADING_KEYS.USER_GROUPS]: false,
                        [LOADING_KEYS.USER_MEETS]: false,
                        [LOADING_KEYS.USER_GAMES_HISTORY]: false,
                    }),
                },
            },
            provideRouter([]),
        ],
    }).compileComponents()

    const fixture = TestBed.createComponent(DashboardPageComponent)
    fixture.detectChanges()
    return fixture
}

describe('DashboardPageComponent (Home)', () => {
    it('greets the user and lists the next three game nights across groups', async () => {
        const fixture = await renderHome({
            userMeets: signal([
                meet(1, 10, 20),
                meet(2, 11, 2),
                meet(3, 10, 5),
                meet(4, 11, 9),
                meet(5, 10, -10, 'completed'),
                meet(6, 10, 1, 'cancelled'),
            ]),
        })
        const component = fixture.componentInstance

        expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Hi, David')
        expect(component.upcomingSessions().map((item) => item.id)).toEqual([2, 3, 4])
        expect(fixture.nativeElement.querySelector('a[href="/sessions/2"]')).not.toBeNull()
    })

    it('keeps a game night in progress listed, however long ago it started, and drops planned nights long over', async () => {
        const fixture = await renderHome({
            userMeets: signal([
                // Started two days ago and still running; a planned night two days ago that nobody started.
                meet(7, 10, -2, 'active'),
                meet(8, 10, -2),
                meet(9, 11, 3),
            ]),
        })

        expect(fixture.componentInstance.upcomingSessions().map((item) => item.id)).toEqual([7, 9])
        expect(fixture.nativeElement.querySelector('a[href="/sessions/7"]').textContent).toContain('Happening now')
    })

    it('gives a new account clear next actions when no groups exist', async () => {
        const fixture = await renderHome()
        const text = fixture.nativeElement.textContent

        expect(text).toContain('Start with the people you play with')
        expect(text).toContain('Getting started')
        expect(fixture.nativeElement.querySelector('a[href="/create-group"]')).not.toBeNull()
    })

    it('counts each person once in recently played sessions', async () => {
        const person = (id: number) => ({ id, displayName: `P${id}`, avatar: null })
        const fixture = await renderHome({
            userHistory: signal([
                {
                    meetData: meet(7, 10, -3, 'completed'),
                    attendedBy: [{ id: 1 }, { id: 2 }],
                    // Members also have group-person entries, plus one placeholder.
                    attendedByPeople: [person(1), person(2), person(3)],
                    gamesPlayed: [{ gameData: { titleTranslations: { en: 'Root', es: 'Root' } }, playedBy: [] }],
                },
            ]),
        })

        expect(fixture.nativeElement.textContent).toContain('Root')
        expect(fixture.nativeElement.textContent).toContain('3 people')
    })

    it('counts a session recorded only with group people, and members recorded both ways once', async () => {
        const person = (id: number, accountId: number | null) => ({ id, displayName: `P${id}`, avatar: null, accountId })
        const fixture = await renderHome({
            userHistory: signal([
                {
                    meetData: meet(7, 10, -3, 'completed'),
                    // Accounts 1 and 2 are also listed as their linked group people 11 and 12.
                    attendedBy: [{ id: 1 }, { id: 2 }],
                    attendedByPeople: [person(11, 1), person(12, 2), person(13, null)],
                    gamesPlayed: [{ gameData: { titleTranslations: { en: 'Root', es: 'Root' } }, playedBy: [] }],
                },
                {
                    meetData: meet(7, 11, -2, 'completed'),
                    // Recorded with the wizard: group people only.
                    attendedBy: [],
                    attendedByPeople: [person(11, 1), person(13, null)],
                    gamesPlayed: [{ gameData: { titleTranslations: { en: 'Azul', es: 'Azul' } }, playedBy: [] }],
                },
            ]),
        })

        expect(fixture.nativeElement.textContent).toContain('3 people')
        expect(fixture.nativeElement.textContent).toContain('2 people')
    })
})
