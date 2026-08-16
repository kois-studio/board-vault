import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { Api } from '../../api/api'
import type { GameType, HistoryRecordType, InvitationWithAccountsData, PublicUserType, UserType } from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { SkeletonCardGroupComponent } from '../../components/skeletons/skeleton-card-group/skeleton-card-group.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { ReviewDisplayComponent } from '../../components/ui/review-display/review-display.component'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { LocalStorageService } from '../../core/services/local-storage.service'
import { GroupViewService } from './group-view.service'

@Component({
    imports: [
        RouterLink,
        ContainerWrapperComponent,
        CardAccountComponent,
        CommonModule,
        CustomDatePipe,
        ImageProfileComponent,
        ImageBackgroundComponent,
        ReviewDisplayComponent,
        ButtonComponent,
        SkeletonCardGroupComponent,
        PageHeaderComponent,
    ],
    templateUrl: 'group-view.component.html',
    styleUrls: ['group-view.component.scss'],
})
export class GroupViewComponent {
    private readonly api = inject(Api)
    private readonly router = inject(Router)
    private readonly route = inject(ActivatedRoute)
    private readonly dataService = inject(DataService)
    private readonly groupViewService = inject(GroupViewService)
    private readonly localStorageService = inject(LocalStorageService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userMeets$ = this.dataService.userMeets
    public readonly invitationsGroupIndex$ = this.dataService.invitationsGroupIndex
    public readonly groupHistoryByGroupId$ = this.dataService.groupHistoryByGroupId

    // groupViewService
    public readonly groupData$ = this.groupViewService.groupData
    public readonly selectedMembers$ = this.groupViewService.selectedMembers
    public readonly isFilteringGames$ = this.groupViewService.isFilteringGames
    public readonly isHidingMaxPlayers$ = this.groupViewService.isHidingMaxPlayers
    public readonly isRecalculatingReviews$ = this.groupViewService.isRecalculatingReviews
    public readonly avgReviewsIndexComputed = this.groupViewService.avgReviewsIndexComputed
    public readonly totalUniqueGamesComputed = this.groupViewService.totalUniqueGamesComputed

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public readonly isLoading = signal(false)
    public readonly groupHistoryError = signal(false)
    public readonly groupHistory$ = signal<Array<HistoryRecordType>>([])

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly sortedGroupHistoryComputed = computed(() => {
        return [...this.groupHistory$()].sort((a, b) => new Date(b.meetData.meetDate).getTime() - new Date(a.meetData.meetDate).getTime())
    })

    public readonly isGroupOwnerComputed = computed(() => {
        if (!this.groupData$() || !this.currentUser$()) {
            return false
        }
        return this.groupData$()?.createdBy === this.currentUser$()?.id
    })

    constructor() {
        effect(() => {
            const currentUser = this.currentUser$()
            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
            const group = this.userGroups$().find(group => group.id === groupId)

            if (Number.isNaN(groupId) || !currentUser || !group) {
                return
            }

            // set the group data
            this.groupData$.set(group)

            // get the group history
            const groupHistoryByGroupId = this.groupHistoryByGroupId$()

            if (groupHistoryByGroupId[groupId] !== undefined) {
                this.groupHistoryError.set(false)
                this.groupHistory$.set(groupHistoryByGroupId[groupId])
            } else {
                this.loadGroupHistory(currentUser.id, groupId)
            }
        })
    }

    public retryGroupHistory(): void {
        const currentUser = this.currentUser$()
        const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
        if (!currentUser || Number.isNaN(groupId)) return

        this.loadGroupHistory(currentUser.id, groupId)
    }

    private loadGroupHistory(userId: number, groupId: number): void {
        this.isLoading.set(true)
        this.groupHistoryError.set(false)
        this.api.getGroupMeetings(userId, groupId).subscribe({
            next: groupMeetings => {
                this.groupHistory$.set(groupMeetings)
                this.dataService.groupHistoryByGroupId.set({
                    ...this.dataService.groupHistoryByGroupId(),
                    [groupId]: groupMeetings,
                })
            },
            error: error => {
                console.error(error)
                this.isLoading.set(false)
                this.groupHistoryError.set(true)
                // Keep the cache unset so a retry can request the data again.
                this.groupHistory$.set([])
            },
            complete: () => this.isLoading.set(false),
        })
    }

    // #region Getters

    get invitationsList(): InvitationWithAccountsData[] {
        const groupData = this.groupData$()
        if (!groupData) {
            return []
        }
        return this.invitationsGroupIndex$()[groupData.id] || []
    }

    // #region Parse Data

    parseAttendeeIds(memberIds: Array<UserType['id']>): Array<PublicUserType> {
        const result = memberIds
            .map(memberId => this.groupData$()?.members.find(member => member.id === memberId) || null)
            .filter(member => member !== null)

        // If > 5 members, we will show [1,2,3,4, +n] in the HTML, so we only return the first 4
        //      if 6 -> [1,2,3,4, +2]
        //      if 7 -> [1,2,3,4, +3]
        if (memberIds.length > 5) {
            return result.slice(0, 4)
        }

        return result
    }

    parseGameIds(gameIds: Array<GameType['id']>): Array<GameType> {
        return gameIds.map(gameId => this.totalUniqueGamesComputed().find(game => game.id === gameId)).filter(game => game !== undefined)
    }

    // #region Button Clicks

    onClickSelectAll(): void {
        const groupData = this.groupData$()
        if (!groupData) return

        const allMembersSelected = this.selectedMembers$().length === groupData.members.length
        this.selectedMembers$.set(allMembersSelected ? [] : groupData.members.map(member => member.id))
    }

    onClickMeeting(meetId: number): void {
        this.router.navigate(['/meets', meetId])
    }

    onClickMember(memberId: number) {
        const currentSelected = this.selectedMembers$()
        if (currentSelected.includes(memberId)) {
            this.selectedMembers$.set(currentSelected.filter(id => id !== memberId))
        } else {
            this.selectedMembers$.set([...currentSelected, memberId])
        }
    }

    onClickEditGroup() {
        this.router.navigate(['/groups', this.groupData$()?.id, 'edit'])
    }

    onClickLeaveGroup() {
        this.router.navigate(['/groups', this.groupData$()?.id, 'leave'])
    }

    onClickNewMeet(): void {
        this.router.navigate(['/groups', this.groupData$()?.id, 'meets', 'new'])
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
