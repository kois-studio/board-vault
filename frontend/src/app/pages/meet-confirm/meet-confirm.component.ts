import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import { GameType, MeetType, MeetWithAttendeesAndGamesType, UserType } from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { ToastService } from '../../components/toast/toast.service'
import { DataService } from '../../core/services/data.service'
import { Nullable } from '../../core/types/commons.type'

@Component({
    imports: [CommonModule, CardAccountComponent],
    templateUrl: 'meet-confirm.component.html',
})
export class MeetConfirmComponent {
    // DataService data (filled on init -> effect)
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    private userGroups: ReturnType<typeof this.dataService.userGroups> = []
    private gamesList: ReturnType<typeof this.dataService.gamesList> = []
    public groupData: Nullable<(typeof this.userGroups)[number]> = null
    public meetData: Nullable<MeetWithAttendeesAndGamesType> = null

    // Component state
    public gameReviews: Record<GameType['id'], Record<UserType['id'], number>> = {}
    public avgReviewsIndex: Record<GameType['id'], number> = {}
    public lastMeeting: Nullable<MeetType> = null

    constructor(
        private readonly api: Api,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly toastService: ToastService,
        private readonly dataService: DataService,
    ) {
        effect(async () => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()
            this.gamesList = this.dataService.gamesList()

            // Get Meet Details
            const meetId = Number.parseInt(this.route.snapshot.paramMap.get('meetId') || '')

            this.meetData = await firstValueFrom(this.api.getMeetDetailsById(meetId))

            if (!this.meetData) return
            console.log('🚀 ~ MeetConfirmComponent ~ effect ~ meetData:', this.meetData)

            // Group Data
            const groupData = this.userGroups.find((group) => group.id === this.meetData?.groupId)
            console.log('🚀 ~ MeetConfirmComponent ~ effect ~ groupData:', this.userGroups)

            if (!this.userData || !groupData) return

            this.groupData = groupData
        })
    }

    // getters

    get filteredMembers() {
        return this.groupData?.members.filter((member) => this.meetData?.attendees.includes(member.id))
    }

    get filteredGames() {
        console.log('🚀 ~ MeetConfirmComponent ~ getfilteredGames ~ this.meetData?.playedGames:', this.meetData?.playedGames)
        console.log('🚀 ~ MeetConfirmComponent ~ getfilteredGames ~ this.gamesList:', this.gamesList)
        return this.meetData?.playedGames.map((gameId) => this.gamesList.find((game) => game.id === gameId))
    }

    // click buttons
    onGoBack() {
        this.router.navigate(['/meets', this.meetData?.id])
    }

    onClickMeetConfirm() {
        if (!this.meetData) {
            return
        }

        this.api.confimMeeting(this.meetData?.id).subscribe({
            next: () => {
                this.toastService.success('Meeting confirmed!')
                this.router.navigate(['/meets', this.meetData?.id])
            },
            error: (error) => {
                this.toastService.error('Error confirming meeting')
            },
        })
    }
}
