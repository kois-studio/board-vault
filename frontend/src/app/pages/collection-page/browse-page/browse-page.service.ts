import { Injectable, signal } from '@angular/core'
import { FormControl } from '@angular/forms'
import { GameCompleteType } from '../../../api/api.types'

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
    public readonly isSearching = signal(false)
    public readonly currentPage = signal(1)
    public readonly hasMoreGames = signal(false)
    public readonly searchControl = new FormControl('')
}
