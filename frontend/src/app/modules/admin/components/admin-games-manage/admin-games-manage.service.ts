import { computed, effect, Injectable, inject, signal, untracked } from '@angular/core'
import { FormControl } from '@angular/forms'
import { GameWithTagsAndTranslationsType } from '../../../../api/api.types'
import { DataService } from '../../../../core/services/data.service'

/**
 * This service is used to keep the state of the admin games manage page
 */
@Injectable({ providedIn: 'root' })
export class AdminGamesManageService {
    // --------------------------------------------------------------------------
    //        Signals
    // --------------------------------------------------------------------------
    public readonly gamesList = signal<Array<GameWithTagsAndTranslationsType>>([])
    public readonly searchTerm = signal('')
    public readonly searchTermIsValidComputed = computed(
        () => this.searchTerm().trim().length >= 3 || this.searchTerm().trim().length === 0,
    )
    public readonly isSearching = signal(false)
    public readonly searchControl = new FormControl('')

    private readonly dataService = inject(DataService)

    constructor() {
        // Signing out clears this state, so the next account never sees it.
        effect(() => {
            if (!this.dataService.currentUser()) untracked(() => this.reset())
        })
    }

    public reset(): void {
        this.gamesList.set([])
        this.searchTerm.set('')
        this.isSearching.set(false)
        this.searchControl.setValue('', { emitEvent: false })
    }
}
