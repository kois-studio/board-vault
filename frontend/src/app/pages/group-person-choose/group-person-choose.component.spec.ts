import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { type Observable, of, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupPersonChoiceType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { DataService } from '../../core/services/data.service'
import { GroupPersonChooseComponent } from './group-person-choose.component'

const person = (id: number, displayName: string) =>
    ({
        id,
        groupId: 10,
        accountId: null,
        kind: 'placeholder',
        status: 'active',
        displayName,
        avatar: null,
        createdAt: '2026-10-01 10:00:00',
        updatedAt: '2026-10-01 10:00:00',
        claimedAt: null,
        standing: 'member',
    }) as GroupPersonChoiceType['person']

const choices: Array<GroupPersonChoiceType> = [
    {
        person: person(12, 'Carlos'),
        suggested: true,
        games: [
            { id: 1, title: 'Azul' },
            { id: 2, title: 'Catan' },
            { id: 3, title: 'Hanabi' },
            { id: 4, title: 'Patchwork' },
            { id: 5, title: null },
        ],
        nights: 4,
        lastNight: '2026-10-30T19:00:00.000Z',
    },
    { person: person(13, 'Dana'), suggested: false, games: [{ id: 2, title: 'Catan' }], nights: 1, lastNight: '2026-10-03 19:00:00' },
    { person: person(14, 'Eli'), suggested: false, games: [], nights: 0, lastNight: null },
]

describe('GroupPersonChooseComponent', () => {
    const render = async (response: Observable<Array<GroupPersonChoiceType>> = of(choices)) => {
        const api = {
            getGroupPersonChoices: vi.fn().mockReturnValue(response),
            joinGroupAsNewPerson: vi.fn().mockReturnValue(of({})),
        }
        TestBed.configureTestingModule({
            imports: [GroupPersonChooseComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ groupId: '10' }) } } },
                { provide: Api, useValue: api },
                { provide: DataService, useValue: { userGroups: () => [{ id: 10, name: 'Thursdays' }], refreshUserGroups: vi.fn() } },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        })
        const fixture = TestBed.createComponent(GroupPersonChooseComponent)
        await fixture.whenStable()
        fixture.detectChanges()
        return { element: fixture.nativeElement as HTMLElement, api, fixture }
    }

    it('lists the people without an account, the suggested one first, with their games and nights', async () => {
        const { element } = await render()
        const items = [...element.querySelectorAll('[data-testid="choice"]')].map((item) => item.textContent?.replace(/\s+/g, ' ') ?? '')

        expect(element.querySelector('h1')?.textContent).toContain('Who are you in Thursdays?')
        expect(items).toHaveLength(3)
        expect(items[0]).toContain('Is this you?')
        expect(items[0]).toContain('Owns Azul, Catan, Hanabi and 2 more games')
        expect(items[0]).toContain('Came to 4 game nights, the last on')
        expect(items[1]).not.toContain('Is this you?')
        expect(items[1]).toContain('Owns Catan')
        expect(items[1]).toContain('Came to 1 game night, on')
        expect(items[2]).toContain('No game nights recorded yet')
        const link = element.querySelector('[data-testid="choice"] a')
        expect(link?.getAttribute('href')).toBe('/groups/10/people/12/claim')
        expect(link?.getAttribute('aria-label')).toBe('This is me: Carlos')
    })

    it('joins as someone new and goes to the group', async () => {
        const { element, api, fixture } = await render()
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)

        element.querySelector<HTMLButtonElement>('[data-testid="choose-new"]')?.click()
        await fixture.whenStable()

        expect(api.joinGroupAsNewPerson).toHaveBeenCalledWith(10)
        expect(TestBed.inject(DataService).refreshUserGroups).toHaveBeenCalledTimes(1)
        expect(navigate).toHaveBeenCalledWith(['/groups', 10])
    })

    it('says there is no one to choose once you are one of the group’s people', async () => {
        const { element } = await render(of([]))

        expect(element.querySelector('[data-testid="choose-nothing"]')).not.toBeNull()
        expect(element.querySelector('[data-testid="choose-new"]')).toBeNull()
    })

    it('offers Retry, not "I’m new here", when Board Vault does not answer', async () => {
        const { element, api, fixture } = await render(throwError(() => new HttpErrorResponse({ status: 503 })))

        expect(element.querySelector('[data-testid="choose-load-failed"]')).not.toBeNull()
        expect(element.querySelector('[data-testid="choose-new"]')).toBeNull()

        api.getGroupPersonChoices.mockReturnValue(of(choices))
        element.querySelector<HTMLButtonElement>('[data-testid="choose-load-failed"] button')?.click()
        await fixture.whenStable()
        fixture.detectChanges()
        expect(element.querySelectorAll('[data-testid="choice"]')).toHaveLength(3)
    })
})
