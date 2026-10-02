import { Component, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import type { GameCompleteType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { ToastService } from '../toast/toast.service'
import { WishlistToggleComponent } from './wishlist-toggle.component'

const GAME: GameCompleteType = {
    id: 7,
    imageUrl: '',
    gameAvgDuration: 30,
    minPlayers: 2,
    maxPlayers: 4,
    titleTranslations: { en: 'Azul', es: 'Azul' },
}

@Component({
    imports: [WishlistToggleComponent],
    template: '<app-wishlist-toggle [game]="game" (changed)="last = $event" />',
})
class HostComponent {
    game = GAME
    last: boolean | null = null
}

describe('WishlistToggleComponent', () => {
    let fixture: ComponentFixture<HostComponent>
    const userWishlist = signal<GameCompleteType[]>([])
    const toggleWishlist = vi.fn()
    const success = vi.fn()

    beforeEach(async () => {
        userWishlist.set([])
        toggleWishlist.mockReset()
        success.mockReset()
        await TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [
                { provide: DataService, useValue: { userWishlist, toggleWishlist } },
                { provide: ToastService, useValue: { success, error: vi.fn() } },
            ],
        }).compileComponents()
        fixture = TestBed.createComponent(HostComponent)
        fixture.detectChanges()
    })

    const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement

    it('names the action for the current state', () => {
        expect(button().getAttribute('aria-label')).toBe('Add Azul to your wishlist')

        userWishlist.set([GAME])
        fixture.detectChanges()

        expect(button().getAttribute('aria-label')).toBe('Remove Azul from your wishlist')
    })

    it('toggles, reports the new state, and offers an undo', async () => {
        toggleWishlist.mockImplementation(async () => {
            userWishlist.set([GAME])
            return true
        })

        button().click()
        await fixture.whenStable()

        expect(toggleWishlist).toHaveBeenCalledWith(GAME)
        expect(fixture.componentInstance.last).toBe(true)
        expect(success).toHaveBeenCalledWith('Added to your wishlist', expect.objectContaining({ label: 'Undo' }))
    })
})
