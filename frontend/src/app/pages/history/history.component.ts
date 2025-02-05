import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Api } from '../../api/api'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { TitleSubtitleComponent } from '../../components/ui/title-subtitle/title-subtitle.component'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import type { Nullable } from '../../core/types/commons.type'

@Component({
    standalone: true,
    imports: [CommonModule, CustomDatePipe, TitleSubtitleComponent, ContainerWrapperComponent],
    templateUrl: 'history.component.html',
})
export class HistoryComponent {
    public loaded = false

    // DataService data (filled on init -> effect)
    public userData: ReturnType<typeof this.dataService.currentUser> = null

    // Component state

    constructor(
        private readonly api: Api,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
    ) {
        effect(async () => {
            this.userData = this.dataService.currentUser()
            // this.userHistory

            this.loaded = true
        })
    }
}
