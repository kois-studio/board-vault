import { CommonModule } from '@angular/common'
import { Component, Input, computed, inject, signal } from '@angular/core'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    selector: 'app-form-schedule-session',
    imports: [
        CommonModule,
    ],
    templateUrl: 'form-schedule-session.component.html',
})
export class FormScheduleSessionComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userHistory$ = this.dataService.userHistory
    // loadingService
    public readonly isLoadingHistory = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GAMES_HISTORY])

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly sortedUserHistoryComputed = computed(() => {
        return this.userHistory$().sort((a, b) => new Date(b.meetData.meetDate).getTime() - new Date(a.meetData.meetDate).getTime())
    })

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    @Input({ required: true }) showForm = false
}
