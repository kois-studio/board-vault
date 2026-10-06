import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupPersonWorkspaceType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { MeetNewComponent } from './meet-new.component'

describe('MeetNewComponent social handoff', () => {
    // The form defaults to today at 19:00; a morning clock keeps that start in the future whenever the tests run.
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 9, 6, 10, 0))
    })
    afterEach(() => vi.useRealTimers())

    const organizer = {
        id: 1,
        displayName: 'Organizer',
        username: 'organizer',
        avatar: null,
        games: [{ id: 42, title: 'Cascadia', titleTranslations: { en: 'Cascadia', es: 'Cascadia' }, minPlayers: 1, maxPlayers: 4 }],
    }
    const member = { id: 2, displayName: 'Member', username: 'member', avatar: null, games: [] as typeof organizer.games }
    const group = { id: 7, name: 'Friday Crew', createdBy: 1, members: [organizer, member] }

    const setup = async (queryParams: Record<string, string> = {}, groupData = group, people: Array<GroupPersonWorkspaceType> = []) => {
        const api = {
            scheduleSession: vi
                .fn()
                .mockName('scheduleSession')
                .mockReturnValue(of({ id: 99 })),
            getGroupPeople: vi.fn().mockName('getGroupPeople').mockReturnValue(of({ people })),
            getGroupPersonCatalog: vi.fn().mockName('getGroupPersonCatalog').mockReturnValue(of([])),
        }
        const routerData = {
            snapshot: {
                paramMap: convertToParamMap({ groupId: '7' }),
                queryParamMap: convertToParamMap(queryParams),
            },
        }
        const dataService = {
            currentUser: signal({ id: 1 }),
            userGroups: signal([groupData]),
            invitationsGroupIndex: signal({}),
            userGroupsError: signal(false),
            refreshUserMeets: vi.fn().mockName('refreshUserMeets'),
        }
        const loadingService = {
            loadingStatesIndex: signal({ [LOADING_KEYS.USER_GROUPS]: false }),
        }

        await TestBed.configureTestingModule({
            imports: [MeetNewComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: routerData },
                { provide: DataService, useValue: dataService },
                { provide: LoadingService, useValue: loadingService },
                { provide: ToastService, useValue: { success: vi.fn().mockName('success'), error: vi.fn().mockName('error') } },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(MeetNewComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        return { fixture, component: fixture.componentInstance, api, dataService, loadingService }
    }

    it('invites everyone by default and shows a long name without overflowing', async () => {
        const longName = '⸻'.repeat(20)
        const { fixture, component } = await setup({}, { ...group, members: [organizer, { ...member, displayName: longName }] })
        fixture.detectChanges()

        expect(component.selectedAttendeeIds()).toEqual([1, 2])
        const tile = [...fixture.nativeElement.querySelectorAll('button[aria-pressed]')].find((element: HTMLElement) =>
            element.textContent?.includes(longName),
        ) as HTMLButtonElement
        const name = tile.querySelector('span.wrap-anywhere') as HTMLSpanElement
        expect(tile.getAttribute('aria-pressed')).toBe('true')
        expect(name.parentElement?.classList).toContain('min-w-0')
    })

    it('restores selected attendees and the recommended game from the decision handoff', async () => {
        const { component } = await setup({ attendeeIds: '2', plannedGameId: '42' })

        expect(component.groupData()?.id).toBe(7)
        expect(component.selectedAttendeeIds()).toEqual([2])
        expect(component.selectedPlannedGameIds()).toEqual([42])
        expect(component.availableGames().map((game) => game.id)).toEqual([42])
    })

    it('lists who brings each game and whether the player count fits', async () => {
        const { component } = await setup()

        expect(component.shortlistGames()).toEqual([expect.objectContaining({ title: 'Cascadia', owners: ['Organizer'], fits: true })])
        component.toggleAttendee(1)
        expect(component.shortlistGames()[0]?.owners).toEqual([])
    })

    it('invites group people once they load, and sends them as group people', async () => {
        const people = [
            {
                person: { id: 12, accountId: 1, displayName: 'Organizer', status: 'active', avatar: null },
                ownership: [],
                preferences: [],
                claimable: false,
            },
            {
                person: { id: 13, accountId: null, displayName: 'Guest', status: 'active', avatar: null },
                ownership: [{ gameId: 42, status: 'asserted' }],
                preferences: [],
                claimable: false,
            },
            {
                person: { id: 14, accountId: null, displayName: 'Gone', status: 'archived', avatar: null },
                ownership: [],
                preferences: [],
                claimable: false,
            },
        ] as unknown as Array<GroupPersonWorkspaceType>
        const { fixture, component, api } = await setup({}, group, people)

        expect(component.useGroupPeople()).toBe(true)
        expect(component.people().map((person) => person.name)).toEqual(['Organizer', 'Guest'])
        expect(component.selectedAttendeeIds()).toEqual([12, 13])
        expect(component.shortlistGames()[0]?.owners).toEqual(['Organizer', 'Guest'])

        await component.onClickCreateMeeting()
        await fixture.whenStable()

        expect(api.scheduleSession).toHaveBeenCalledWith(expect.objectContaining({ groupPersonIds: [12, 13] }))
    })

    it('plans the night only after at least one person is invited', async () => {
        const { component, api, dataService } = await setup()
        component.clearAttendees()

        expect(component.canCreate()).toBe(false)
        component.selectAllAttendees()
        expect(component.canCreate()).toBe(true)

        component.notes.set('Try the group recommendation.')
        await component.onClickCreateMeeting()

        expect(api.scheduleSession).toHaveBeenCalledWith(
            expect.objectContaining({
                groupId: 7,
                attendeeIds: [1, 2],
                plannedGameIds: [],
                notes: 'Try the group recommendation.',
                timezone: expect.any(String),
            }),
        )
        expect(dataService.refreshUserMeets).toHaveBeenCalled()
        expect(component.isCreating()).toBe(false)
    })

    it('rejects a day in the past', async () => {
        const { component } = await setup()

        component.pickDate('2000-01-01')

        expect(component.dateForm.hasError('futureDate')).toBe(true)
        expect(component.canCreate()).toBe(false)
    })

    it('rejects a start earlier today, and explains how to plan or record it', async () => {
        vi.setSystemTime(new Date(2026, 9, 6, 20, 15))
        const { fixture, component } = await setup()

        // Today at 19:00, the default, is already over at 20:15.
        expect(component.startsInThePast()).toBe(true)
        expect(component.canCreate()).toBe(false)
        fixture.detectChanges()
        const timeInput = fixture.nativeElement.querySelector('#session-time') as HTMLInputElement
        expect(timeInput.getAttribute('aria-invalid')).toBe('true')
        expect(fixture.nativeElement.querySelector('#session-date-error').textContent).toContain('That time has already passed today')

        // The current minute still counts, and any later time is fine.
        component.timeForm.setValue('20:15')
        expect(component.canCreate()).toBe(true)
        component.timeForm.setValue('21:00')
        expect(component.startsInThePast()).toBe(false)
        expect(component.canCreate()).toBe(true)
        fixture.detectChanges()
        expect(fixture.nativeElement.querySelector('#session-date-error').textContent.trim()).toBe('')
    })

    it('keeps the same evening open on a later day', async () => {
        vi.setSystemTime(new Date(2026, 9, 6, 20, 15))
        const { component } = await setup()

        component.pickDate('2026-10-07')

        expect(component.startsInThePast()).toBe(false)
        expect(component.canCreate()).toBe(true)
    })

    it('checks the time again when planning, in case it passed while the page was open', async () => {
        vi.setSystemTime(new Date(2026, 9, 6, 18, 50))
        const { component, api } = await setup()
        expect(component.canCreate()).toBe(true)

        vi.setSystemTime(new Date(2026, 9, 6, 19, 5))
        await component.onClickCreateMeeting()

        expect(api.scheduleSession).not.toHaveBeenCalled()
        expect(component.startsInThePast()).toBe(true)
    })

    it('clears stale planning context when the group disappears during a refresh', async () => {
        const { fixture, component, dataService } = await setup()

        expect(component.groupData()?.id).toBe(7)
        dataService.userGroups.set([])
        fixture.detectChanges()

        expect(component.groupData()).toBeNull()
        expect(component.selectedAttendeeIds()).toEqual([])
        expect(component.selectedPlannedGameIds()).toEqual([])
        expect(component.groupUnavailable()).toBe(true)
    })
})
