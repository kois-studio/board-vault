import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { MyGamesPageComponent } from './my-games-page.component'

describe('MyGamesPageComponent private collection boundary', () => {
    const setup = async () => {
        const dataService = {
            currentUser: signal(null),
            userGames: signal<Array<Record<string, unknown>>>([]),
            userGamesError: signal(false),
            userWishlist: signal([]),
        }

        await TestBed.configureTestingModule({
            imports: [MyGamesPageComponent],
            providers: [
                { provide: DataService, useValue: dataService },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({ [LOADING_KEYS.USER_GAMES]: false }) } },
                provideRouter([]),
            ],
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
})
