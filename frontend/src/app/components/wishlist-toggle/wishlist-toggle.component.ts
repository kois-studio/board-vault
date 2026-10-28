import { Component, computed, inject, input, output, signal } from '@angular/core'
import type { GameCompleteType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { gameTitle } from '../../core/utils/gameTitle'
import { ToastService } from '../toast/toast.service'
import { IconComponent } from '../ui/icon/icon.component'

/**
 * The heart on a game cover. It shows whether the game is on your wishlist and
 * toggles it; with a mouse it slides open to name the action. Position it from
 * the parent (for example `class="absolute right-2 top-2"`).
 */
@Component({
    imports: [IconComponent],
    selector: 'app-wishlist-toggle',
    host: { class: 'inline-flex' },
    templateUrl: 'wishlist-toggle.component.html',
})
export class WishlistToggleComponent {
    private readonly dataService = inject(DataService)
    private readonly toastService = inject(ToastService)

    readonly game = input.required<GameCompleteType>()
    /** Emits the new state after the server confirms it. */
    readonly changed = output<boolean>()

    protected readonly busy = signal(false)
    protected readonly popping = signal(false)
    protected readonly wishlisted = computed(() => this.dataService.userWishlist().some((game) => game.id === this.game().id))
    protected readonly stateClass = computed(() =>
        [
            this.wishlisted() ? 'border-bv-danger/30 text-bv-danger' : 'border-bv-border text-bv-text-muted hover:text-bv-text',
            this.popping() ? 'scale-125' : '',
        ].join(' '),
    )
    protected readonly actionLabel = computed(() =>
        this.wishlisted()
            ? $localize`:Label of the heart on a game cover when the game is on your wishlist:Remove from wishlist`
            : $localize`:Label of the heart on a game cover:Add to wishlist`,
    )
    protected readonly ariaLabel = computed(() =>
        this.wishlisted()
            ? $localize`:Accessible name of the heart on a game cover when the game is on your wishlist; the placeholder is the game title:Remove ${gameTitle(this.game())}:title: from your wishlist`
            : $localize`:Accessible name of the heart on a game cover; the placeholder is the game title:Add ${gameTitle(this.game())}:title: to your wishlist`,
    )

    protected async toggle(): Promise<void> {
        if (this.busy()) return
        this.busy.set(true)
        try {
            const isWishlisted = await this.dataService.toggleWishlist(this.game())
            this.changed.emit(isWishlisted)
            if (isWishlisted) {
                this.popping.set(true)
                setTimeout(() => this.popping.set(false), 300)
            }
            this.toastService.success(
                isWishlisted
                    ? $localize`:Toast after adding a game to your wishlist:Added to your wishlist`
                    : $localize`:Toast after removing a game from your wishlist:Removed from your wishlist`,
                {
                    label: $localize`:Button on a toast that reverts what you just did:Undo`,
                    run: () => this.toggle(),
                },
            )
        } catch {
            this.toastService.error(
                $localize`:Toast when adding or removing a game from your wishlist failed:Could not update your wishlist. Try again.`,
            )
        } finally {
            this.busy.set(false)
        }
    }
}
