import { Injectable, computed, signal } from '@angular/core'
import { FormControl } from '@angular/forms'
import { GameWithTagsAndTranslationsType } from '../../../../api/api.types'

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
}
