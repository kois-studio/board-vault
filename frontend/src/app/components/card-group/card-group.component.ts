import { CommonModule } from '@angular/common'
import { Component, Input, effect } from '@angular/core'
import { Router } from '@angular/router'
import type { GroupWithMembersAndGames, MeetType } from '../../api/api.types'
import type { GameType, InvitationWithAccountsData } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { CardAccountComponent } from '../card-account/card-account.component'

@Component({
    imports: [CommonModule, CardAccountComponent],
    selector: 'app-card-group',
    templateUrl: 'card-group.component.html',
})
export class CardGroupComponent {
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    public userMeets: ReturnType<typeof this.dataService.userMeets> = []
    public lastMeeting: MeetType | null = null

    @Input({ required: true }) group!: GroupWithMembersAndGames
    @Input({ required: true }) invitations: undefined | Array<InvitationWithAccountsData> = []

    constructor(
        private readonly router: Router,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userMeets = this.dataService.userMeets()
            this.updateLastMeeting()
        })
    }

    private updateLastMeeting() {
        const sortedMeets = this.userMeets
            .filter((meet) => meet.groupId === this.group.id)
            .sort((a, b) => new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime())

        this.lastMeeting = sortedMeets.length >= 1 ? sortedMeets[0] : null
    }

    get meetingTodayAlreadyCreated(): null | MeetType['id'] {
        if (!this.lastMeeting) {
            return null
        }
        const today = new Date()
        const lastMeetingDate = new Date(this.lastMeeting.meetDate)

        const isSameDay =
            lastMeetingDate.getFullYear() === today.getFullYear() &&
            lastMeetingDate.getMonth() === today.getMonth() &&
            lastMeetingDate.getDate() === today.getDate()

        return isSameDay ? this.lastMeeting.id : null
    }

    get totalGames(): Array<GameType> {
        // index all games by gameId so we don't duplicate games
        const games: Record<GameType['id'], GameType> = {}

        for (const member of this.group.members) {
            for (const game of member.games) {
                games[game.id] = game
            }
        }

        return Object.values(games)
    }

    onOpenGroup() {
        this.router.navigate(['/group', this.group.id])
    }
}
