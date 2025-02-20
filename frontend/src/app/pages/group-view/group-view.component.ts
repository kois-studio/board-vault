import { CommonModule } from '@angular/common'
import { Component, effect, inject } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Api } from '../../api/api'
import type {
    GameType,
    GroupWithMembersAndGames,
    InvitationWithAccountsData,
    MeetWithAttendeesAndGamesType,
    UserType,
} from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { ReviewDisplayComponent } from '../../components/ui/review-display/review-display.component'
import { TitleSubtitleComponent } from '../../components/ui/title-subtitle/title-subtitle.component'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { LocalStorageService } from '../../core/services/local-storage.service'
import { GroupViewService } from './group-view.service'

@Component({
    imports: [
        TitleSubtitleComponent,
        ContainerWrapperComponent,
        CardAccountComponent,
        CommonModule,
        CustomDatePipe,
        ImageProfileComponent,
        ImageBackgroundComponent,
        ReviewDisplayComponent,
        ButtonComponent,
    ],
    templateUrl: 'group-view.component.html',
    styleUrls: ['group-view.component.scss'],
})
export class GroupViewComponent {
    private readonly dataService = inject(DataService)
    private readonly groupViewService = inject(GroupViewService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userMeets$ = this.dataService.userMeets
    public readonly invitationsGroupIndex$ = this.dataService.invitationsGroupIndex

    // groupViewService
    public readonly groupMembers$ = this.groupViewService.groupMembers
    public readonly selectedMembers$ = this.groupViewService.selectedMembers
    public readonly isFilteringGames$ = this.groupViewService.isFilteringGames
    public readonly isHidingMaxPlayers$ = this.groupViewService.isHidingMaxPlayers
    public readonly isRecalculatingReviews$ = this.groupViewService.isRecalculatingReviews
    public readonly gameReviews$ = this.groupViewService.gameReviews
    public readonly avgReviewsIndexComputed = this.groupViewService.avgReviewsIndexComputed
    public readonly totalUniqueGamesComputed = this.groupViewService.totalUniqueGamesComputed

    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupData: null | GroupWithMembersAndGames = null
    public groupMeetings: Array<MeetWithAttendeesAndGamesType> = []

    // --------------------------------------------------------------------------
    //        flags
    // --------------------------------------------------------------------------
    public isLoading = false

    constructor(
        private readonly api: Api,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly localStorageService: LocalStorageService,
    ) {
        effect(() => {
            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
            const groupData = this.userGroups$().find((group) => group.id === groupId)

            if (Number.isNaN(groupId) || !this.currentUser$() || !groupData) {
                return
            }

            this.groupData = groupData

            // After getting group data, index all reviews by gameId
            this._indexReviews(groupData.members)
            this.groupMembers$.set(groupData.members)

            // Get the group meetings data (with its members and games)
            this.api.getGroupMeetings(groupId).subscribe({
                next: (groupMeetings) => {
                    this.groupMeetings = groupMeetings.sort((a, b) => {
                        return new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime()
                    })
                },
                error: (error) => {
                    console.error(error)
                },
            })
        })
    }

    private _indexReviews(members: GroupWithMembersAndGames['members']) {
        const reviews: Record<GameType['id'], Record<UserType['id'], number>> = {}

        for (const member of members) {
            for (const review of member.reviews) {
                if (reviews[review.gameId] === undefined) {
                    reviews[review.gameId] = {}
                }
                reviews[review.gameId][member.id] = review.review
            }
        }

        this.gameReviews$.set(reviews)
    }

    // #region Getters

    get invitationsList(): InvitationWithAccountsData[] {
        if (!this.groupData) {
            return []
        }
        return this.invitationsGroupIndex$()[this.groupData.id] || []
    }

    // #region Parse Data

    parseAttendeeIds(memberIds: Array<UserType['id']>): Array<UserType> {
        const result = memberIds
            .map((memberId) => this.groupData?.members.find((member) => member.id === memberId) || null)
            .filter((member) => member !== null)

        // If > 5 members, we will show [1,2,3,4, +n] in the HTML, so we only return the first 4
        //      if 6 -> [1,2,3,4, +2]
        //      if 7 -> [1,2,3,4, +3]
        if (memberIds.length > 5) {
            return result.slice(0, 4)
        }

        return result
    }

    parseGameIds(gameIds: Array<GameType['id']>): Array<GameType> {
        return gameIds
            .map((gameId) => this.totalUniqueGamesComputed().find((game) => game.id === gameId))
            .filter((game) => game !== undefined)
    }

    // #region Button Clicks

    onClickSelectAll(): void {
        if (!this.groupData) return

        const allMembersSelected = this.selectedMembers$().length === this.groupData.members.length
        this.selectedMembers$.set(allMembersSelected ? [] : this.groupData.members.map((member) => member.id))
    }

    onClickMeeting(meetId: number): void {
        this.router.navigate(['/meets', meetId])
    }

    onClickMember(memberId: number) {
        const currentSelected = this.selectedMembers$()
        if (currentSelected.includes(memberId)) {
            this.selectedMembers$.set(currentSelected.filter((id) => id !== memberId))
        } else {
            this.selectedMembers$.set([...currentSelected, memberId])
        }
    }

    onClickEditGroup() {
        this.router.navigate(['/group', this.groupData?.id, 'edit'])
    }

    onClickLeaveGroup() {
        this.router.navigate(['/group', this.groupData?.id, 'leave'])
    }

    onClickNewMeet(): void {
        this.router.navigate(['/group', this.groupData?.id, 'meets', 'new'])
    }

    onGoBack() {
        this.router.navigate(['/dashboard'])
    }

    // #region Filters

    public toggleGamesFilter(): void {
        const newValue = !this.isFilteringGames$()
        this.isFilteringGames$.set(newValue)
        this.localStorageService.setItem('isFilteringGames', newValue.toString())
    }

    public toggleMaxPlayersFilter(): void {
        const newValue = !this.isHidingMaxPlayers$()
        this.isHidingMaxPlayers$.set(newValue)
        this.localStorageService.setItem('isHidingMaxPlayers', newValue.toString())
    }

    public toggleRecalculateReviews(): void {
        const newValue = !this.isRecalculatingReviews$()
        this.isRecalculatingReviews$.set(newValue)
        this.localStorageService.setItem('isRecalculatingReviews', newValue.toString())
    }
}
