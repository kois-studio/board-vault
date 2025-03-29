import { Injectable, signal } from '@angular/core'
import { LOADING_KEYS } from '../enums/loading-keys-enum'

@Injectable({ providedIn: 'root' })
export class LoadingService {
    /**
     * By default, all operations are loading (state 0)
     * all this data is meant to be an array of results (except USER_DATA, which is the source for all other)
     *
     * after loading is finished (which is set with the dedicated methods), 2 outcomes are possible:
     * data.length == 0 -> error (depending on the component, show a message, an error, whatever)
     * data.length > 0 -> success (show the data)
     */
    public readonly loadingStatesIndex = signal<Record<string, boolean>>({
        [LOADING_KEYS.USER_DATA]: true,
        [LOADING_KEYS.USER_INVITATIONS]: true,
        [LOADING_KEYS.USER_NOTIFICATIONS]: true,
        [LOADING_KEYS.USER_REVIEWS]: true,
        [LOADING_KEYS.USER_GROUPS]: true,
        [LOADING_KEYS.USER_MEETS]: true,
        [LOADING_KEYS.USER_GAMES_HISTORY]: true,
        [LOADING_KEYS.USER_WISHLIST]: true,
    })

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public finish(key: LOADING_KEYS) {
        this.loadingStatesIndex.update((prev) => ({ ...prev, [key]: false }))
    }

    public setAllLoadingTo(loading: boolean) {
        this.loadingStatesIndex.update((prev) => {
            const updatedStates = { ...prev }
            for (const key in updatedStates) {
                updatedStates[key] = loading
            }
            return updatedStates
        })
    }
}
