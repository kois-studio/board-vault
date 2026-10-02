import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { DataService } from '../../core/services/data.service'
import { IconComponent } from '../ui/icon/icon.component'

@Component({
    imports: [CommonModule, RouterLink, IconComponent],
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
        [...this.userCollectionActivity$()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    )

    // --------------------------------------------------------------------------
    //        component props
    // --------------------------------------------------------------------------
    // Track whether to show all activities or just 5
    public showAllActivity = false

    public getActivityIcon(actionType: string): string {
        return (
            {
                added: 'bookmark',
                rated: 'star',
                removed: 'x',
                updated: 'pencil',
                wishlisted: 'heart',
                unwishlisted: 'heart-off',
            }[actionType] ?? 'circle-help'
        )
    }

    // Helper method to format date as relative time
    formatTimeAgo(dateString: string): string {
        // Handle server date format by explicitly treating it as UTC
        // The server sends dates without timezone info but they are in UTC
        const date = new Date(`${dateString.replace(' ', 'T')}Z`)
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
            day: 'numeric',
        })
    }
}
