import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType, GroupCollectionType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { GroupPersonPageComponent } from './group-person-page.component'

describe('GroupPersonPageComponent', () => {
    const game = (id: number, title: string): GameCompleteType => ({
        id,
        title,
        imageUrl: '',
        gameAvgDuration: 30,
        minPlayers: 2,
        maxPlayers: 4,
        titleTranslations: { en: title, es: title },
    })
    const collection: GroupCollectionType = {
        worth: 130,
        copies: 4,
        pricedCopies: 3,
        people: [
            {
                accountId: 1,
                groupPersonId: null,
                displayName: 'Ana Ruiz',
                avatar: null,
                games: [game(1, 'Catan'), game(3, 'Hanabi')],
                worth: 45,
                pricedGames: 1,
            },
            { accountId: null, groupPersonId: 20, displayName: 'Nora', avatar: null, games: [game(2, 'Azul')], worth: 40, pricedGames: 1 },
            { accountId: null, groupPersonId: 23, displayName: 'Quim', avatar: null, games: [game(3, 'Hanabi')], worth: 0, pricedGames: 0 },
            // A catalogue game whose title is missing still shows, and its link has a name.
            {
                accountId: null,
                groupPersonId: 24,
                displayName: 'Pablo',
                avatar: null,
                games: [game(63, ''), game(2, 'Azul')],
                worth: 0,
                pricedGames: 0,
            },
        ],
    }
    const standings = [{ accountId: 1, groupPersonId: 30, displayName: 'Ana Ruiz', avatar: null, sessions: 4, gamesPlayed: 9, wins: 3 }]

    const render = async (params: Record<string, string>) => {
        const api = {
            getGroupCollection: vi.fn().mockReturnValue(of(collection)),
            getGroupInsights: vi.fn().mockReturnValue(of({ standings })),
        }
        TestBed.configureTestingModule({
            imports: [GroupPersonPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ groupId: '10', ...params })) } },
                { provide: Api, useValue: api },
                { provide: DataService, useValue: { userGroups: () => [{ id: 10, name: 'Thursdays' }] } },
            ],
        })
        const fixture = TestBed.createComponent(GroupPersonPageComponent)
        await fixture.whenStable()
        fixture.detectChanges()
        return { element: fixture.nativeElement as HTMLElement, api }
    }

    it("shows a member's approximate collection worth, their games and their game nights", async () => {
        const { element, api } = await render({ accountId: '1' })
        const text = element.textContent ?? ''

        expect(api.getGroupCollection).toHaveBeenCalledWith(10)
        expect(element.querySelector('h1')?.textContent).toContain('Ana Ruiz')
        expect(text).toContain('Member of Thursdays')
        expect(text).toContain('≈ €45')
        expect(text).toContain('From the retail prices of 1 of their 2 games. What anyone actually paid stays private.')
        expect([...element.querySelectorAll('#person-games-heading + ul li p')].map((item) => item.textContent?.trim())).toEqual([
            'Catan',
            'Hanabi',
        ])
        expect(text).toMatch(/Wins\s*3/)
    })

    it('finds a person without an account by their group person', async () => {
        const { element } = await render({ personId: '20' })
        const text = element.textContent ?? ''

        expect(element.querySelector('h1')?.textContent).toContain('Nora')
        expect(text).toContain('In Thursdays, without an account')
        expect(text).toContain('≈ €40')
        expect(text).toContain('From the retail prices of their 1 game.')
        expect(text).toContain('No finished game nights with this group yet.')
    })

    it('says so when no price is known, instead of showing a worth of nothing', async () => {
        const { element } = await render({ personId: '23' })

        expect(element.textContent).toContain('No retail prices are known for their games yet.')
        expect(element.textContent).not.toContain('≈')
    })

    it('names a game without a title instead of showing an empty card', async () => {
        const { element } = await render({ personId: '24' })
        const items = [...element.querySelectorAll('#person-games-heading + ul li')]

        expect(items.map((item) => item.querySelector('p')?.textContent?.trim())).toEqual(['Untitled game', 'Azul'])
        expect(items[0]?.querySelector('a')?.textContent).toContain('Untitled game')
        expect(items[0]?.querySelector('p')?.getAttribute('title')).toBe('Untitled game')
    })

    it('says when the person is not in the group', async () => {
        const { element } = await render({ accountId: '99' })

        expect(element.textContent).toContain('This person is not in this group.')
    })
})
