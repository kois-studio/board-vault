import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { type Observable, of, Subject, throwError } from 'rxjs'

import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { DataService } from '../../core/services/data.service'
import { ApiUnavailableError } from '../../core/utils/apiUnavailable'
import { GroupPersonClaimComponent } from './group-person-claim.component'

describe('GroupPersonClaimComponent', () => {
    const person = {
        person: {
            id: 21,
            groupId: 12,
            accountId: null,
            kind: 'placeholder',
            status: 'active',
            displayName: 'Ana',
            avatar: null,
            createdAt: '2026-09-26',
            updatedAt: '2026-09-26',
            claimedAt: null,
        },
        ownership: [
            {
                gameId: 42,
                status: 'asserted',
                source: 'placeholder_setup',
                enteredByAccountId: 7,
                confirmedByAccountId: null,
                createdAt: '2026-09-26',
                updatedAt: '2026-09-26',
            },
        ],
        preferences: [
            {
                gameId: 42,
                preference: 'favorite',
                source: 'placeholder_setup',
                enteredByAccountId: 7,
                createdAt: '2026-09-26',
                updatedAt: '2026-09-26',
            },
        ],
        claimable: true,
        suggested: false,
    }

    type PeopleAnswer = { people: Array<typeof person> }
    const catan = [{ id: 42, title: 'Catan', titleTranslations: { en: 'Catan', es: 'Catan' } }]

    async function createComponent(people: Observable<PeopleAnswer> = of({ people: [person] }), catalog: Observable<unknown> = of(catan)) {
        const api = {
            getGroupPeople: vi.fn().mockName('getGroupPeople').mockReturnValue(people),
            getGroupPersonCatalog: vi.fn().mockName('getGroupPersonCatalog').mockReturnValue(catalog),
            claimGroupPerson: vi
                .fn()
                .mockName('claimGroupPerson')
                .mockReturnValue(of({ success: true, alreadyClaimed: false })),
            joinGroupAsNewPerson: vi
                .fn()
                .mockName('joinGroupAsNewPerson')
                .mockReturnValue(of({ id: 22 })),
        }
        const router = { events: of(), navigate: vi.fn().mockName('navigate').mockResolvedValue(true) }
        const toastService = { success: vi.fn().mockName('success') }
        const dataService = {
            refreshUserGroups: vi.fn().mockName('refreshUserGroups'),
            refreshUserGames: vi.fn().mockName('refreshUserGames'),
        }

        await TestBed.configureTestingModule({
            imports: [GroupPersonClaimComponent],
            providers: [
                { provide: Api, useValue: api },
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toastService },
                { provide: DataService, useValue: dataService },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap({ groupId: '12', personId: '21' }) } },
                },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(GroupPersonClaimComponent)
        await fixture.whenStable()
        fixture.detectChanges()
        const byTestId = (id: string) => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${id}"]`)
        const text = () => (fixture.nativeElement as HTMLElement).textContent ?? ''
        return { fixture, component: fixture.componentInstance, api, router, toastService, dataService, byTestId, text }
    }

    const unreachable = () =>
        throwError(() => new ApiUnavailableError({ kind: 'network', outcomeUnknown: false, url: '/groups/12/people' }))
    const answered = (status: number) => throwError(() => new HttpErrorResponse({ status, url: '/groups/12/people' }))

    /** Lets the load settle and the page render, including afterNextRender callbacks. */
    async function settle(fixture: Awaited<ReturnType<typeof createComponent>>['fixture']) {
        await fixture.whenStable()
        fixture.detectChanges()
        await fixture.whenStable()
    }

    it('loads a claimable placeholder and preserves the review selections', async () => {
        const { component, api, dataService } = await createComponent()

        expect(component.person()?.person.displayName).toBe('Ana')
        expect(component.selectedOwnership()).toEqual(new Set([42]))
        expect(component.selectedPreferences()).toEqual(new Set([42]))

        component.toggleOwnership(42)
        component.importOwnership.set(true)
        await component.claim()

        expect(api.claimGroupPerson).toHaveBeenCalledWith(12, 21, {
            ownershipGameIds: [],
            preferenceGameIds: [42],
            importOwnershipToCollection: true,
        })
        expect(component.claimSummary()).toEqual({
            ownershipKept: 0,
            ownershipDiscarded: 1,
            preferencesKept: 1,
            preferencesDiscarded: 0,
            importedOwnership: true,
        })
        // The group's people changed, and so did your shelf: both load again.
        expect(dataService.refreshUserGroups).toHaveBeenCalledTimes(1)
        expect(dataService.refreshUserGames).toHaveBeenCalledTimes(1)
    })

    it('does not expose a non-claimable placeholder as claimable data', async () => {
        const { api } = await createComponent()
        api.getGroupPeople.mockReturnValue(of({ people: [{ ...person, claimable: false }] }))

        const fixture = TestBed.createComponent(GroupPersonClaimComponent)
        await fixture.whenStable()

        expect(fixture.componentInstance.person()).toBeNull()
        expect(fixture.componentInstance.error()).toBe('This group person is not available for your account.')
    })

    describe('when the handoff cannot be loaded (#244)', () => {
        it('offers Retry, not joining as a new person, when Board Vault does not answer', async () => {
            const { component, byTestId, text } = await createComponent(unreachable())

            expect(component.loadFailed()).toBe(true)
            expect(byTestId('claim-load-failed')?.getAttribute('role')).toBe('alert')
            expect(text()).toContain('This handoff couldn’t be loaded')
            expect(text()).toContain('We could not load the group person data. Please try again.')
            expect(byTestId('claim-retry')).not.toBeNull()
            expect(text()).not.toContain('Join as a new person')
            expect(text()).not.toContain('This handoff is unavailable')
        })

        it('treats a server error like no answer', async () => {
            const { component, text } = await createComponent(
                throwError(() => new ApiUnavailableError({ kind: 'server', outcomeUnknown: false, url: '/groups/12/people', status: 503 })),
            )

            expect(component.loadFailed()).toBe(true)
            expect(text()).not.toContain('Join as a new person')
        })

        it('treats a failed game list like failed people', async () => {
            const { component, text } = await createComponent(of({ people: [person] }), unreachable())

            expect(component.loadFailed()).toBe(true)
            expect(component.person()).toBeNull()
            expect(text()).not.toContain('Join as a new person')
        })

        for (const status of [403, 404]) {
            it(`keeps the choice to join as a new person when the handoff is not there (${status})`, async () => {
                const { component, byTestId, text } = await createComponent(answered(status))

                expect(component.loadFailed()).toBe(false)
                expect(byTestId('claim-load-failed')).toBeNull()
                expect(text()).toContain('This handoff is unavailable')
                expect(text()).toContain('This group person is not available for your account.')
                expect(text()).toContain('Join as a new person')
            })
        }

        it('keeps the message, busy, while Retry loads, and ignores a second press', async () => {
            const { fixture, api, byTestId } = await createComponent(unreachable())
            const retried = new Subject<PeopleAnswer>()
            api.getGroupPeople.mockReturnValue(retried)

            byTestId('claim-retry')?.click()
            fixture.detectChanges()
            expect(byTestId('claim-load-failed')).not.toBeNull()
            expect(byTestId('claim-retry')?.getAttribute('aria-busy')).toBe('true')
            byTestId('claim-retry')?.click()
            expect(api.getGroupPeople).toHaveBeenCalledTimes(2)
        })

        it('shows the handoff after a successful Retry and moves focus to its heading', async () => {
            const { fixture, component, api, byTestId } = await createComponent(unreachable())
            const retried = new Subject<PeopleAnswer>()
            api.getGroupPeople.mockReturnValue(retried)
            byTestId('claim-retry')?.click()

            retried.next({ people: [person] })
            retried.complete()
            await settle(fixture)

            expect(byTestId('claim-load-failed')).toBeNull()
            expect(component.error()).toBeNull()
            expect(component.person()?.person.displayName).toBe('Ana')
            expect(document.activeElement?.id).toBe('claim-heading')
        })

        it('leaves focus alone when it was moved while Retry loaded', async () => {
            const { fixture, api, byTestId } = await createComponent(unreachable())
            const retried = new Subject<PeopleAnswer>()
            api.getGroupPeople.mockReturnValue(retried)
            byTestId('claim-retry')?.click()
            // Focusable outside the page (the back link has no href with the router mocked).
            const elsewhere = document.body.appendChild(document.createElement('button'))
            elsewhere.focus()

            retried.next({ people: [person] })
            retried.complete()
            await settle(fixture)

            expect(document.activeElement).toBe(elsewhere)
            elsewhere.remove()
        })

        it('says so again when Retry fails too', async () => {
            const { fixture, component, api, byTestId } = await createComponent(unreachable())
            byTestId('claim-retry')?.click()
            await settle(fixture)

            expect(api.getGroupPeople).toHaveBeenCalledTimes(2)
            expect(component.loadFailed()).toBe(true)
            expect(byTestId('claim-retry')?.getAttribute('aria-busy')).toBeNull()
        })

        it('shows the unavailable choice when Retry finds the handoff gone', async () => {
            const { fixture, api, byTestId, text } = await createComponent(unreachable())
            api.getGroupPeople.mockReturnValue(answered(404))
            byTestId('claim-retry')?.click()
            await settle(fixture)

            expect(byTestId('claim-load-failed')).toBeNull()
            expect(text()).toContain('Join as a new person')
            // The Retry button is gone; focus goes to what replaced it.
            expect(document.activeElement?.id).toBe('claim-unavailable-heading')
        })

        it('shows the unavailable choice, with focus on it, when Retry finds the person is not for you', async () => {
            const { fixture, api, byTestId, text } = await createComponent(unreachable())
            api.getGroupPeople.mockReturnValue(of({ people: [{ ...person, claimable: false }] }))
            byTestId('claim-retry')?.click()
            await settle(fixture)

            expect(text()).toContain('This handoff is unavailable')
            expect(document.activeElement?.id).toBe('claim-unavailable-heading')
        })

        it('does not move focus when the page first loads as unavailable', async () => {
            await createComponent(answered(403))

            expect(document.activeElement).toBe(document.body)
        })
    })
})
