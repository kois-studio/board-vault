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
            userGames: signal<Array<{ id: number }>>([]),
            userGamesError: signal(false),
            userWishlist: signal([]),
            userCollectionActivity: signal([]),
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
})
