import { computed, effect, Injectable, inject, signal, untracked } from '@angular/core'
import { FormControl } from '@angular/forms'
import { GameCompleteType } from '../../../api/api.types'
import { DataService } from '../../../core/services/data.service'

/**
 * This service is user to keep the state of the browse page
 */
@Injectable({ providedIn: 'root' })
export class BrowsePageService {
    // --------------------------------------------------------------------------
    //        Signals
    // --------------------------------------------------------------------------
    public readonly browseGamesList = signal<Array<GameCompleteType>>([])
    public readonly searchTerm = signal('')
    public readonly searchTermIsValidComputed = computed(() => {
        // Empty lists the whole catalogue; otherwise search from two letters.
        const trimmedTerm = this.searchTerm().trim()
        return trimmedTerm.length === 0 || trimmedTerm.length >= 2
    })
    public readonly isSearching = signal(false)
    public readonly currentPage = signal(1)
    public readonly hasMoreGames = signal(false)
    public readonly searchControl = new FormControl<string>('')

    private readonly dataService = inject(DataService)

    constructor() {
        // Signing out clears this state, so the next account never sees it.
        effect(() => {
            if (!this.dataService.currentUser()) untracked(() => this.reset())
        })
    }

    public reset(): void {
        this.browseGamesList.set([])
        this.searchTerm.set('')
        this.isSearching.set(false)
        this.currentPage.set(1)
        this.hasMoreGames.set(false)
        this.searchControl.setValue('', { emitEvent: false })
    }
}
