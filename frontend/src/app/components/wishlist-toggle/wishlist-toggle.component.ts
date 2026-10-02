import { Component, computed, inject, input, output, signal } from '@angular/core'
import type { GameCompleteType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
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
    protected readonly actionLabel = computed(() => (this.wishlisted() ? 'Remove from wishlist' : 'Add to wishlist'))
    protected readonly ariaLabel = computed(() =>
        this.wishlisted()
            ? `Remove ${this.game().titleTranslations.en} from your wishlist`
            : `Add ${this.game().titleTranslations.en} to your wishlist`,
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
            this.toastService.success(isWishlisted ? 'Added to your wishlist' : 'Removed from your wishlist', {
                label: 'Undo',
                run: () => this.toggle(),
            })
        } catch {
            this.toastService.error('Could not update your wishlist. Try again.')
        } finally {
            this.busy.set(false)
        }
    }
}
