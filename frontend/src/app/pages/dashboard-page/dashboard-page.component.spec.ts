import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { DashboardPageComponent } from './dashboard-page.component'

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

function meet(id: number, groupId: number, days: number, status = 'scheduled', gamesToBring: Array<number> = []) {
    return {
        id,
        groupId,
        createdBy: 1,
        meetDate: inDays(days),
        isConfirmed: false,
        status,
        timezone: 'Europe/Madrid',
        notes: null,
        myRsvpStatus: null,
        gamesToBring,
    }
}

function group(id: number, name: string) {
    return {
        id,
        name,
        createdBy: 1,
        createdAt: '2026-09-01T10:00:00.000Z',
        members: [{ id: 1, username: 'dawichi', displayName: 'David', avatar: null, games: [], reviews: [] }],
        placeholders: [],
    }
}

const emptyNight = { attendeeStatuses: [], participants: [], participantStatuses: [], plannedGames: [], gameVotes: [] }

async function renderHome(overrides: Record<string, unknown> = {}) {
    const dataService = {
        currentUser: signal({ id: 1, username: 'dawichi', displayName: 'David', avatar: null }),
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
        answerSession: vi.fn(),
        ...overrides,
    }

    await TestBed.configureTestingModule({
        imports: [DashboardPageComponent],
        providers: [
            { provide: DataService, useValue: dataService },
            { provide: Api, useValue: { getSessionDetailsById: () => of(emptyNight) } },
            { provide: ToastService, useValue: { error: vi.fn() } },
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

const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ') ?? ''

describe('DashboardPageComponent (Home)', () => {
    describe('a new account', () => {
        it('points at the first group and shows nothing that is still empty', async () => {
            const fixture = await renderHome()
            const element = fixture.nativeElement as HTMLElement

            expect(element.querySelector('h1')?.textContent).toContain('Welcome, David')
            expect(text(element)).toContain('Create your first group')
            expect(text(element)).toContain('Getting set up')
            expect(text(element)).not.toContain('Next game night')
            expect(text(element)).not.toContain('Your history')
            expect(text(element)).not.toContain('Plan a game night')
        })

        it('ticks off the games once some are on the shelf', async () => {
            const fixture = await renderHome({ userGames: signal([{ id: 1, titleTranslations: { en: 'Azul' } }]) })

            expect(text(fixture.nativeElement)).toContain('1 of 3 done')
            expect(text(fixture.nativeElement)).toContain('Add the games you own (done)')
        })
    })

    describe('with one group', () => {
        const oneGroup = { userGroups: signal([group(10, 'Friday crew')]) }

        it('leads with the soonest night and lists the next two below it', async () => {
            const fixture = await renderHome({
                ...oneGroup,
                userMeets: signal([
                    meet(1, 10, 20),
                    meet(2, 10, 2),
                    meet(3, 10, 5),
                    meet(4, 10, 9),
                    meet(5, 10, -10, 'completed'),
                    meet(6, 10, 1, 'cancelled'),
                ]),
            })
            const element = fixture.nativeElement as HTMLElement

            expect(element.querySelector('h1')?.textContent).toContain('Hi, David')
            expect(fixture.componentInstance.nextNight()?.id).toBe(2)
            expect(element.querySelector('app-next-night-card a[href="/sessions/2"]')).not.toBeNull()
            const later = Array.from(element.querySelectorAll('ul[aria-label="Later game nights"] a')).map((link) =>
                link.getAttribute('href'),
            )
            expect(later).toEqual(['/sessions/3', '/sessions/4'])
        })

        it('leads with a night in progress, however long ago it started, and drops planned nights long over', async () => {
            const fixture = await renderHome({
                ...oneGroup,
                userMeets: signal([meet(7, 10, -2, 'active'), meet(8, 10, -2), meet(9, 10, 3)]),
            })

            expect(fixture.componentInstance.upcomingSessions().map((item) => item.id)).toEqual([7, 9])
            expect(text(fixture.nativeElement.querySelector('app-next-night-card'))).toContain('Happening now')
        })

        it('says which games you are bringing to the next night', async () => {
            const fixture = await renderHome({
                ...oneGroup,
                userMeets: signal([meet(1, 10, 2, 'scheduled', [42, 43])]),
                userGames: signal([
                    { id: 42, title: 'Azul', titleTranslations: { en: 'Azul' } },
                    { id: 43, title: 'Wingspan', titleTranslations: { en: 'Wingspan' } },
                ]),
            })

            expect(text(fixture.nativeElement.querySelector('app-next-night-card'))).toContain('You’re bringing: Azul, Wingspan')
        })

        it('offers to plan straight into the group when nothing is planned', async () => {
            const fixture = await renderHome(oneGroup)
            const element = fixture.nativeElement as HTMLElement

            expect(text(element)).toContain('No game night planned')
            const plan = Array.from(element.querySelectorAll('a')).find((link) => link.textContent?.trim() === 'Plan one')
            expect(plan?.getAttribute('href')).toBe('/groups/10/sessions/new')
        })

        it('shows the group as one large card, with a small link for another group', async () => {
            const fixture = await renderHome(oneGroup)
            const element = fixture.nativeElement as HTMLElement

            expect(element.querySelector('#groups-heading')?.textContent).toContain('Your group')
            expect(element.querySelectorAll('app-card-group')).toHaveLength(1)
            expect(
                element.querySelector('#groups-heading')?.parentElement?.querySelector('a[href="/create-group"]')?.textContent,
            ).toContain('New group')
            expect(text(element)).not.toContain('Create another group')
        })

        it('invites recording a past night while there is no history', async () => {
            const fixture = await renderHome(oneGroup)
            const element = fixture.nativeElement as HTMLElement

            expect(text(element)).toContain('Nothing recorded yet')
            expect(element.querySelector('a[href="/play/log-session"]')).not.toBeNull()
        })

        it('links to your page in the group', async () => {
            const fixture = await renderHome({
                ...oneGroup,
                userGames: signal([{ id: 1, titleTranslations: { en: 'Azul' } }]),
            })
            const profile = (fixture.nativeElement as HTMLElement).querySelector('a[href="/groups/10/members/1"]')

            expect(text(profile)).toContain('1 game · 0 nights played')
            expect(text(profile)).toContain('Your profile in Friday crew')
        })
    })

    describe('with several groups', () => {
        it('lists them compactly: a night under way, then the soonest planned, then the most recently played', async () => {
            const fixture = await renderHome({
                userGroups: signal([group(1, 'Quiet'), group(2, 'Played'), group(3, 'Planned'), group(4, 'Live'), group(5, 'Later')]),
                userMeets: signal([meet(1, 2, -30, 'completed'), meet(2, 3, 1), meet(3, 4, 0, 'active'), meet(4, 5, 6)]),
            })
            const element = fixture.nativeElement as HTMLElement

            expect(element.querySelector('#groups-heading')?.textContent).toContain('Your groups')
            expect(element.querySelector('app-card-group')).toBeNull()
            const items = Array.from(element.querySelectorAll('section[aria-labelledby="groups-heading"] li'))
            expect(items.map((item) => item.querySelector('.font-bold')?.textContent?.trim())).toEqual([
                'Live',
                'Planned',
                'Later',
                'Played',
                'Quiet',
            ])
            const rows = items.map((item) => text(item))
            expect(rows[0]).toContain('Happening now')
            expect(rows[1]).toContain('Tomorrow')
            expect(rows[3]).toContain('Last:')
            expect(rows[4]).toContain('No nights yet')
        })

        it('asks which group to plan in', async () => {
            const fixture = await renderHome({ userGroups: signal([group(1, 'One'), group(2, 'Two')]) })
            const plan = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).find(
                (link) => link.textContent?.trim() === 'Plan one',
            )

            expect(plan?.getAttribute('href')).toBe('/play/upcoming-sessions?plan=1')
        })
    })

    describe('recently played', () => {
        const groups = { userGroups: signal([group(10, 'Friday crew')]) }

        it('counts each person once', async () => {
            const person = (id: number) => ({ id, displayName: `P${id}`, avatar: null })
            const fixture = await renderHome({
                ...groups,
                userHistory: signal([
                    {
                        meetData: meet(7, 10, -3, 'completed'),
                        attendedBy: [{ id: 1 }, { id: 2 }],
                        // Members also have group-person entries, plus one placeholder.
                        attendedByPeople: [person(1), person(2), person(3)],
                        gamesPlayed: [{ gameData: { titleTranslations: { en: 'Root', es: 'Root' }, imageUrl: '' }, playedBy: [] }],
                    },
                ]),
            })

            expect(text(fixture.nativeElement)).toContain('Root')
            expect(text(fixture.nativeElement)).toContain('3 people')
        })

        it('counts a session recorded only with group people, and members recorded both ways once', async () => {
            const person = (id: number, accountId: number | null) => ({ id, displayName: `P${id}`, avatar: null, accountId })
            const fixture = await renderHome({
                ...groups,
                userHistory: signal([
                    {
                        meetData: meet(7, 10, -3, 'completed'),
                        // Accounts 1 and 2 are also listed as their linked group people 11 and 12.
                        attendedBy: [{ id: 1 }, { id: 2 }],
                        attendedByPeople: [person(11, 1), person(12, 2), person(13, null)],
                        gamesPlayed: [{ gameData: { titleTranslations: { en: 'Root', es: 'Root' }, imageUrl: '' }, playedBy: [] }],
                    },
                    {
                        meetData: meet(8, 10, -2, 'completed'),
                        // Recorded with the wizard: group people only.
                        attendedBy: [],
                        attendedByPeople: [person(11, 1), person(13, null)],
                        gamesPlayed: [{ gameData: { titleTranslations: { en: 'Azul', es: 'Azul' }, imageUrl: '' }, playedBy: [] }],
                    },
                ]),
            })

            expect(text(fixture.nativeElement)).toContain('3 people')
            expect(text(fixture.nativeElement)).toContain('2 people')
        })
    })
})
