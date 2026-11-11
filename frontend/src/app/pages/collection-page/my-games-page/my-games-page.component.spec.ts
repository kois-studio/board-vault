import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import type { ResourceStatus } from '../../../core/async/resource-state'
import { withStates } from '../../../core/async/resource-state.testing'
import { DataService } from '../../../core/services/data.service'
import { MyGamesPageComponent } from './my-games-page.component'

describe('MyGamesPageComponent private collection boundary', () => {
    const setup = async (status: ResourceStatus = 'ready') => {
        const dataService = {
            currentUser: signal(null),
            userGames: signal<Array<Record<string, unknown>>>([]),
            userWishlist: signal([]),
        }

        await TestBed.configureTestingModule({
            imports: [MyGamesPageComponent],
            providers: [{ provide: DataService, useValue: withStates(dataService, { userGames: status }) }, provideRouter([])],
        }).compileComponents()

        const fixture = TestBed.createComponent(MyGamesPageComponent)
        fixture.detectChanges()
        return { fixture, dataService }
    }

    it('turns an empty collection into clear next actions', async () => {
        const { fixture } = await setup()

        expect(fixture.nativeElement.textContent).toContain('Only you see this list')
        expect(fixture.nativeElement.textContent).toContain('Add your first game')
        expect(fixture.nativeElement.textContent).toContain('Go to groups')
    })

    const game = (id: number, minPlayers: number, maxPlayers: number) => ({
        id,
        imageUrl: '',
        gameAvgDuration: 30,
        minPlayers,
        maxPlayers,
        titleTranslations: { en: `Game ${String(id).padStart(2, '0')}`, es: '' },
    })

    it('hides the filters for a short shelf', async () => {
        const { fixture, dataService } = await setup()
        dataService.userGames.set([game(1, 2, 4), game(2, 1, 1)])
        fixture.detectChanges()

        expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull()
        expect(fixture.nativeElement.textContent).toContain('2 games')
    })

    it('filters a long shelf by player count', async () => {
        const { fixture, dataService } = await setup()
        // Twelve games: one solo game and eleven for 2–4 players.
        dataService.userGames.set([game(1, 1, 1), ...Array.from({ length: 11 }, (_, index) => game(index + 2, 2, 4))])
        fixture.detectChanges()

        fixture.componentInstance.setPlayerCount('1')
        fixture.detectChanges()

        expect(fixture.componentInstance.visibleGames().map((visible) => visible.id)).toEqual([1])
        expect(fixture.nativeElement.textContent).toContain('1 of 12 games')
    })

    // #256: the shelf stays on screen while it reloads; the empty shelf only once it has loaded empty.
    it('keeps your games on screen while they reload', async () => {
        const { fixture, dataService } = await setup('refreshing')
        dataService.userGames.set([game(1, 2, 4), game(2, 1, 1)])
        fixture.detectChanges()

        expect(fixture.nativeElement.textContent).toContain('2 games')
    })

    it('does not offer to add a first game while your games load', async () => {
        const { fixture } = await setup('loading')

        expect(fixture.nativeElement.textContent).not.toContain('Add your first game')
    })
})
