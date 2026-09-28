import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { CollectionPageComponent } from './collection-page.component'

describe('CollectionPageComponent activation guidance', () => {
    const createDataService = () => ({
        currentUser: signal(null),
        userGroups: signal<Array<{ id: number; members: Array<{ id: number; games: Array<{ id: number }> }> }>>([]),
        userGames: signal<Array<{ id: number }>>([]),
        userGamesError: signal(false),
        userReviews: signal<Array<unknown>>([]),
        userWishlist: signal<Array<unknown>>([]),
        userCollectionActivity: signal<Array<unknown>>([]),
    })

    const createLoadingService = () => ({
        loadingStatesIndex: signal({ [LOADING_KEYS.USER_GAMES]: false }),
    })

    const setup = async () => {
        const dataService = createDataService()
        await TestBed.configureTestingModule({
            imports: [CollectionPageComponent],
            providers: [
                { provide: DataService, useValue: dataService },
                { provide: LoadingService, useValue: createLoadingService() },
                provideRouter([]),
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(CollectionPageComponent)
        fixture.detectChanges()
        return { fixture, component: fixture.componentInstance, dataService }
    }

    it('offers a group decision before the five-game target when the group has usable games', async () => {
        const { fixture, component, dataService } = await setup()
        dataService.userGames.set([{ id: 1 }])
        dataService.userGroups.set([{ id: 10, members: [{ id: 1, games: [{ id: 1 }] }] }])
        fixture.detectChanges()

        expect(component.activationComplete()).toBeFalse()
        expect(component.groupDecisionReady()).toBeTrue()
        expect(component.decisionGroupId()).toBe(10)
        expect(fixture.nativeElement.querySelector('a[href="/play/recommendations?groupId=10"]')).not.toBeNull()
        expect(fixture.nativeElement.textContent).toContain('Choose a game with your group')
    })

    it('guides a completed personal shelf toward the group shelf when no group has games yet', async () => {
        const { fixture, component, dataService } = await setup()
        dataService.userGames.set([1, 2, 3, 4, 5].map((id) => ({ id })))
        dataService.userGroups.set([{ id: 10, members: [{ id: 1, games: [] }] }])
        fixture.detectChanges()

        expect(component.activationComplete()).toBeTrue()
        expect(component.groupDecisionReady()).toBeFalse()
        expect(fixture.nativeElement.textContent).toContain('Add games to your group’s shared shelf')
        expect(fixture.nativeElement.textContent).toContain('Group acquisition')
        expect(fixture.nativeElement.textContent).toContain('Private shelf')
    })
})
