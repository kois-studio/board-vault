import { CommonModule } from '@angular/common'
import { Component, OnInit, computed, inject } from '@angular/core'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [CommonModule],
    selector: 'app-collection-activity',
    templateUrl: 'collection-activity.component.html',
})
export class CollectionActivityComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    public readonly userGames$ = this.dataService.userGames
    public readonly userWishlist$ = this.dataService.userWishlist
    public readonly userCollectionActivity$ = this.dataService.userCollectionActivity

    public readonly userCollectionActivitySortedComputed = computed(() =>
        this.userCollectionActivity$().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    )

    // --------------------------------------------------------------------------
    //        component props
    // --------------------------------------------------------------------------
    // Track whether to show all activities or just 5
    public showAllActivity = false

    // Helper method to get game name from gameId
    getGameName(gameId: number): string {
        // Look for the game in userGames first
        const userGame = this.userGames$().find((game) => game.id === gameId)
        if (userGame) return userGame.title

        // If not found, check wishlist
        const wishlistGame = this.userWishlist$().find((game) => game.id === gameId)
        if (wishlistGame) return wishlistGame.title

        // If game is not found, return a placeholder
        return 'Unknown Game'
    }

    // Helper method to format date as relative time
    formatTimeAgo(dateString: string): string {
        // Parse the server's UTC date string
        const date = new Date(dateString)
        const now = new Date()
        
        // Calculate the time difference in seconds
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diffInSeconds < 60) {
            return 'Just now'
        }

        if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60)
            return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
        }

        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600)
            return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
        }

        if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400)
            return `${days} ${days === 1 ? 'day' : 'days'} ago`
        }

        // For older dates, show formatted date in user's local timezone
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }
}
