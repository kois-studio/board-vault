import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { of } from 'rxjs'

import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
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
    }

    async function createComponent() {
        const api = {
            getGroupPeople: jasmine.createSpy('getGroupPeople').and.returnValue(of({ people: [person] })),
            getGroupPersonCatalog: jasmine
                .createSpy('getGroupPersonCatalog')
                .and.returnValue(of([{ id: 42, title: 'Catan', titleTranslations: { en: 'Catan', es: 'Catan' } }])),
            claimGroupPerson: jasmine.createSpy('claimGroupPerson').and.returnValue(of({ success: true, alreadyClaimed: false })),
            joinGroupAsNewPerson: jasmine.createSpy('joinGroupAsNewPerson').and.returnValue(of({ id: 22 })),
        }
        const router = { events: of(), navigate: jasmine.createSpy('navigate').and.resolveTo(true) }
        const toastService = { success: jasmine.createSpy('success') }

        await TestBed.configureTestingModule({
            imports: [GroupPersonClaimComponent],
            providers: [
                { provide: Api, useValue: api },
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toastService },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap({ groupId: '12', personId: '21' }) } },
                },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(GroupPersonClaimComponent)
        await fixture.whenStable()
        return { fixture, component: fixture.componentInstance, api, router, toastService }
    }

    it('loads a claimable placeholder and preserves the review selections', async () => {
        const { component, api } = await createComponent()

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
    })

    it('does not expose a non-claimable placeholder as claimable data', async () => {
        const { api } = await createComponent()
        api.getGroupPeople.and.returnValue(of({ people: [{ ...person, claimable: false }] }))

        const fixture = TestBed.createComponent(GroupPersonClaimComponent)
        await fixture.whenStable()

        expect(fixture.componentInstance.person()).toBeNull()
        expect(fixture.componentInstance.error()).toBe('This group person is not available for your account.')
    })
})
