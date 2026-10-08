import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom, map } from 'rxjs'
import { Api } from '../../api/api'
import type {
    GameCompleteType,
    GroupAcquisitionEntryType,
    GroupCollectionPersonType,
    GroupCollectionType,
    GroupInsightsType,
    GroupPersonPreferenceType,
    GroupPersonWorkspaceType,
    GroupStandingType,
    HistoryRecordType,
    InvitationWithAccountsData,
    PublicUserType,
} from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { SkeletonHistoryComponent } from '../../components/skeletons/skeleton-history/skeleton-history.component'
import { ToastService } from '../../components/toast/toast.service'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { DialogDirective } from '../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { InPageLinkDirective } from '../../components/ui/in-page-link/in-page-link.directive'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { LocalStorageService } from '../../core/services/local-storage.service'
import { formatAttendeeSummary } from '../../core/utils/formatAttendeeSummary'
import { groupGameCount, groupPeopleCount } from '../../core/utils/groupCounts'
import { formatWinners, historyWinnerNames, mergeHistoryParticipants } from '../../core/utils/historyParticipants'
import { initialsAvatar } from '../../core/utils/initialsAvatar'
import { GroupViewService } from './group-view.service'

type GroupLibraryContext = {
    ownerNames: Array<string>
    playCount: number
    lastPlayedAt: string | null
    lastPlayedTimezone: string | null
}

export function shouldShowFirstGroupSetup(input: {
    memberCount: number
    gameCount: number
    historyCount: number
    hasUpcomingSession: boolean
    historyLoading: boolean
    historyError: boolean
}): boolean {
    if (input.historyLoading || input.historyError) return false

    return input.memberCount <= 1 && input.gameCount === 0 && input.historyCount === 0 && !input.hasUpcomingSession
}

@Component({
    imports: [
        RouterLink,
        ContainerWrapperComponent,
        CardAccountComponent,
        CommonModule,
        CustomDatePipe,
        ImageBackgroundComponent,
        IconComponent,
        ImageProfileComponent,
        ButtonComponent,
        DialogDirective,
        SkeletonHistoryComponent,
        PageHeaderComponent,
        InPageLinkDirective,
    ],
    templateUrl: 'group-view.component.html',
    styleUrls: ['group-view.component.scss'],
})
export class GroupViewComponent {
    private readonly api = inject(Api)
    private readonly router = inject(Router)
    private readonly route = inject(ActivatedRoute)
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)
    private readonly groupViewService = inject(GroupViewService)
    private readonly localStorageService = inject(LocalStorageService)
    private readonly toastService = inject(ToastService)
    /**
     * The group in the address. Angular keeps this page when only the id changes (the group
     * switcher), so it is read as a signal: a one-time snapshot would keep showing the first group.
     */
    private readonly routeGroupId = toSignal(this.route.paramMap.pipe(map((params) => Number.parseInt(params.get('groupId') || '', 10))), {
        requireSync: true,
    })

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userGroupsError = this.dataService.userGroupsError
    public readonly userMeets$ = this.dataService.userMeets
    public readonly invitationsGroupIndex$ = this.dataService.invitationsGroupIndex
    public readonly groupHistoryByGroupId$ = this.dataService.groupHistoryByGroupId
    public readonly isLoadingGroups = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS])

    // groupViewService
    public readonly groupData$ = this.groupViewService.groupData
    public readonly selectedMembers$ = this.groupViewService.selectedMembers
    public readonly isFilteringGames$ = this.groupViewService.isFilteringGames
    public readonly isHidingMaxPlayers$ = this.groupViewService.isHidingMaxPlayers
    public readonly isRecalculatingReviews$ = this.groupViewService.isRecalculatingReviews
    public readonly avgReviewsIndexComputed = this.groupViewService.avgReviewsIndexComputed
    public readonly totalUniqueGamesComputed = this.groupViewService.totalUniqueGamesComputed
    // Group pulse: everyone in the group, with or without an account, as on Home.
    public readonly groupPeopleCount = groupPeopleCount
    public readonly groupGameCount = groupGameCount

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public readonly isLoading = signal(false)
    public readonly groupHistoryError = signal(false)
    public readonly groupHistory$ = signal<Array<HistoryRecordType>>([])
    public readonly acquisitionBoard$ = signal<Array<GroupAcquisitionEntryType>>([])
    public readonly insights$ = signal<GroupInsightsType | null>(null)
    public readonly insightsError = signal(false)
    /** Everyone's games and their approximate worth; null until loaded, or when it could not be. */
    public readonly collection$ = signal<GroupCollectionType | null>(null)
    public readonly collectionLoading = signal(false)
    public readonly collectionError = signal(false)
    private collectionRequest = 0
    private activeInsightsGroupId: number | null = null
    public readonly acquisitionBoardLoading = signal(false)
    public readonly acquisitionBoardError = signal(false)
    public readonly acquisitionMutationGameId = signal<number | null>(null)
    public readonly acquisitionDecisionMutationGameId = signal<number | null>(null)
    public readonly acquisitionMutationErrors = signal<Record<number, string>>({})
    public readonly acquisitionDecisionErrors = signal<Record<number, string>>({})
    public readonly groupPeople$ = signal<Array<GroupPersonWorkspaceType>>([])
    public readonly groupPersonCatalog$ = signal<Array<GameCompleteType>>([])
    public readonly groupPeopleLoading = signal(false)
    public readonly groupPeopleError = signal(false)
    public readonly includeArchivedGroupPeople = signal(false)
    public readonly newGroupPersonName = signal('')
    public readonly groupPersonMutationId = signal<number | null>(null)
    public readonly isLeaveDialogOpen = signal(false)
    public readonly isLeavingGroup = signal(false)

    public readonly claimableGroupPersonComputed = computed(() => this.groupPeople$().find((person) => person.claimable) ?? null)
    /** The people list: members who left or deleted their account show only with the archived people (ADR-0018). */
    public readonly visibleGroupPeopleComputed = computed(() =>
        this.groupPeople$().filter(
            (person) =>
                person.person.kind === 'placeholder' ||
                (person.person.standing ?? 'member') === 'member' ||
                this.includeArchivedGroupPeople(),
        ),
    )
    public readonly currentUserHasGroupPersonComputed = computed(() => {
        const userId = this.currentUser$()?.id
        return (
            userId !== undefined &&
            this.groupPeople$().some((person) => person.person.accountId === userId && person.person.kind === 'linked')
        )
    })
    public readonly groupPersonAvailableGamesComputed = computed(() => {
        const games = new Map<number, GameCompleteType>()
        for (const game of this.totalUniqueGamesComputed()) games.set(game.id, game)
        for (const game of this.groupPersonCatalog$()) games.set(game.id, game)
        return [...games.values()]
    })
    private activeSelectionGroupId: number | null = null
    private activeAcquisitionGroupId: number | null = null
    private activePeopleGroupId: number | null = null

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly sortedGroupHistoryComputed = computed(() => {
        return [...this.groupHistory$()].sort((a, b) => new Date(b.meetData.meetDate).getTime() - new Date(a.meetData.meetDate).getTime())
    })

    public readonly recentGroupHistoryComputed = computed(() => this.sortedGroupHistoryComputed().slice(0, 3))

    public readonly upcomingMeetingsComputed = computed(() => {
        const groupId = this.groupData$()?.id
        if (!groupId) return []

        return this.userMeets$()
            .filter((meet) => meet.groupId === groupId && (meet.status === 'scheduled' || meet.status === 'active'))
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime())
    })

    public readonly nextMeetingComputed = computed(() => this.upcomingMeetingsComputed()[0] ?? null)

    public readonly needsFirstGroupSetup = computed(() => {
        const group = this.groupData$()
        if (!group) return false

        return shouldShowFirstGroupSetup({
            memberCount: group.members.length,
            gameCount: this.totalUniqueGamesComputed().length,
            historyCount: this.groupHistory$().length,
            hasUpcomingSession: Boolean(this.nextMeetingComputed()),
            historyLoading: this.isLoading(),
            historyError: this.groupHistoryError(),
        })
    })

    public readonly mostPlayedGamesComputed = computed(() => {
        const games = new Map<number, { gameData: GameCompleteType; sessionCount: number; playerCount: number }>()
        for (const record of this.groupHistory$()) {
            for (const playedGame of record.gamesPlayed) {
                const existing = games.get(playedGame.gameData.id)
                const participantCount = mergeHistoryParticipants(playedGame.playedBy, playedGame.playedByPeople).length
                if (existing) {
                    existing.sessionCount += 1
                    existing.playerCount += participantCount
                } else {
                    games.set(playedGame.gameData.id, {
                        gameData: playedGame.gameData,
                        sessionCount: 1,
                        playerCount: participantCount,
                    })
                }
            }
        }
        return [...games.values()]
            .sort((a, b) => b.sessionCount - a.sessionCount || b.playerCount - a.playerCount || a.gameData.id - b.gameData.id)
            .slice(0, 5)
    })

    public readonly recentlyPlayedGamesComputed = computed(() => {
        const games = new Map<number, { gameData: GameCompleteType; lastPlayedAt: string; participantCount: number }>()
        for (const record of this.sortedGroupHistoryComputed()) {
            for (const playedGame of record.gamesPlayed) {
                if (!games.has(playedGame.gameData.id)) {
                    games.set(playedGame.gameData.id, {
                        gameData: playedGame.gameData,
                        lastPlayedAt: record.meetData.meetDate,
                        participantCount: mergeHistoryParticipants(playedGame.playedBy, playedGame.playedByPeople).length,
                    })
                }
            }
        }

        return [...games.values()].slice(0, 5)
    })

    public readonly revisitGamesComputed = computed(() => {
        const recentlyPlayedIds = new Set(
            this.recentlyPlayedGamesComputed()
                .slice(0, 3)
                .map((game) => game.gameData.id),
        )
        return this.mostPlayedGamesComputed()
            .filter((game) => !recentlyPlayedIds.has(game.gameData.id))
            .slice(0, 5)
    })

    public readonly groupLibraryContextComputed = computed<Record<number, GroupLibraryContext>>(() => {
        const context: Record<number, GroupLibraryContext> = {}

        for (const member of this.groupData$()?.members ?? []) {
            for (const game of member.games) {
                const existing = context[game.id] ?? {
                    ownerNames: [],
                    playCount: 0,
                    lastPlayedAt: null,
                    lastPlayedTimezone: null,
                }

                const ownerName = member.displayName || member.username
                if (!existing.ownerNames.includes(ownerName)) {
                    existing.ownerNames.push(ownerName)
                }
                context[game.id] = existing
            }
        }

        for (const record of this.groupHistory$()) {
            for (const playedGame of record.gamesPlayed) {
                const existing = context[playedGame.gameData.id] ?? {
                    ownerNames: [],
                    playCount: 0,
                    lastPlayedAt: null,
                    lastPlayedTimezone: null,
                }

                existing.playCount += 1
                if (!existing.lastPlayedAt || new Date(record.meetData.meetDate).getTime() > new Date(existing.lastPlayedAt).getTime()) {
                    existing.lastPlayedAt = record.meetData.meetDate
                    existing.lastPlayedTimezone = record.meetData.timezone
                }
                context[playedGame.gameData.id] = existing
            }
        }

        return context
    })

    public readonly selectedMembersLabel = computed(() => {
        const selectedCount = this.selectedMembers$().length
        return `${selectedCount} of ${this.groupData$()?.members.length ?? 0} selected`
    })

    public getAttendeeSummary(attendees: Array<PublicUserType>, people: HistoryRecordType['attendedByPeople'] = []): string {
        // Older sessions list the same people as accounts and as group people: count each once.
        return formatAttendeeSummary(mergeHistoryParticipants(attendees, people))
    }

    public getWinners(game: HistoryRecordType['gamesPlayed'][number]): string {
        return formatWinners(historyWinnerNames(game))
    }

    public getPlayerCount(game: HistoryRecordType['gamesPlayed'][number]): number {
        return mergeHistoryParticipants(game.playedBy, game.playedByPeople).length
    }

    public readonly isGroupOwnerComputed = computed(() => {
        if (!this.groupData$() || !this.currentUser$()) {
            return false
        }
        return this.groupData$()?.createdBy === this.currentUser$()?.id
    })

    constructor() {
        effect(() => {
            const currentUser = this.currentUser$()
            const groupId = this.routeGroupId()
            const group = this.userGroups$().find((group) => group.id === groupId)

            if (this.activeSelectionGroupId !== groupId) {
                this.activeSelectionGroupId = groupId
                this.activeAcquisitionGroupId = null
                this.groupData$.set(null)
                this.groupHistory$.set([])
                this.groupHistoryError.set(false)
                // The previous group's loads no longer finish here (isShowing); this group's loads set them again.
                this.isLoading.set(false)
                this.acquisitionBoardLoading.set(false)
                this.groupPeopleLoading.set(false)
                this.acquisitionBoard$.set([])
                this.acquisitionBoardError.set(false)
                this.insights$.set(null)
                this.insightsError.set(false)
                this.collection$.set(null)
                this.collectionLoading.set(false)
                this.collectionError.set(false)
                this.activeInsightsGroupId = null
                this.groupPeople$.set([])
                this.groupPeopleError.set(false)
                this.activePeopleGroupId = null
            }

            if (Number.isNaN(groupId) || !currentUser || !group) {
                this.groupData$.set(null)
                return
            }

            // set the group data
            this.groupData$.set(group)

            // GroupViewService is shared across routes, so establish a fresh
            // default selection whenever this component displays another group.
            this.selectedMembers$.set(group.members.map((member) => member.id))

            if (this.activeAcquisitionGroupId !== groupId) {
                this.activeAcquisitionGroupId = groupId
                this.loadAcquisitionBoard(groupId)
            }

            if (this.activeInsightsGroupId !== groupId) {
                this.activeInsightsGroupId = groupId
                this.loadInsights(groupId)
                this.loadCollection(groupId)
            }

            if (this.activePeopleGroupId !== groupId) {
                this.activePeopleGroupId = groupId
                this.loadGroupPeople(groupId)
            }

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
        const groupId = this.routeGroupId()
        if (!currentUser || Number.isNaN(groupId)) return

        this.loadGroupHistory(currentUser.id, groupId)
    }

    public retryGroups(): void {
        this.dataService.refreshUserGroups()
    }

    public onGroupSwitcherChange(event: Event): void {
        const groupId = Number((event.target as HTMLSelectElement).value)
        if (!Number.isInteger(groupId) || groupId <= 0 || !this.userGroups$().some((group) => group.id === groupId)) return

        void this.router.navigate(['/groups', groupId])
    }

    public retryAcquisitionBoard(): void {
        const groupId = this.groupData$()?.id
        if (!groupId) return

        this.loadAcquisitionBoard(groupId)
    }

    public retryGroupPeople(): void {
        const groupId = this.groupData$()?.id
        if (groupId) this.loadGroupPeople(groupId)
    }

    public toggleArchivedGroupPeople(): void {
        const groupId = this.groupData$()?.id
        if (!groupId) return
        this.includeArchivedGroupPeople.update((value) => !value)
        this.loadGroupPeople(groupId)
    }

    public retryGroupPersonCatalog(): void {
        const groupId = this.groupData$()?.id
        if (groupId) this.loadGroupPersonCatalog(groupId)
    }

    public async addGroupPerson(): Promise<void> {
        const groupId = this.groupData$()?.id
        const displayName = this.newGroupPersonName().trim()
        if (!groupId || !this.isGroupOwnerComputed() || !displayName || this.groupPersonMutationId()) return

        this.groupPersonMutationId.set(-1)
        try {
            await firstValueFrom(this.api.createGroupPerson(groupId, displayName))
            this.newGroupPersonName.set('')
            this.toastService.success(`${displayName} was added to the group.`)
            this.loadGroupPeople(groupId)
        } catch {
            this.toastService.error('Could not add this person to the group.')
        } finally {
            this.groupPersonMutationId.set(null)
        }
    }

    public async archiveGroupPerson(person: GroupPersonWorkspaceType): Promise<void> {
        const groupId = this.groupData$()?.id
        if (!groupId || !this.isGroupOwnerComputed() || this.groupPersonMutationId()) return

        this.groupPersonMutationId.set(person.person.id)
        try {
            const nextStatus = person.person.status === 'archived' ? 'active' : 'archived'
            await firstValueFrom(this.api.updateGroupPerson(groupId, person.person.id, { status: nextStatus }))
            this.toastService.success(nextStatus === 'active' ? 'The group person was restored.' : 'The group person was archived.')
            this.loadGroupPeople(groupId)
        } catch {
            this.toastService.error('Could not archive this group person.')
        } finally {
            this.groupPersonMutationId.set(null)
        }
    }

    public ownsGroupPersonGame(person: GroupPersonWorkspaceType, gameId: number): boolean {
        return person.ownership.some((ownership) => ownership.gameId === gameId && ownership.status === 'asserted')
    }

    public getGroupPersonOwnershipStatus(
        person: GroupPersonWorkspaceType,
        gameId: number,
    ): GroupPersonWorkspaceType['ownership'][number]['status'] | null {
        return person.ownership.find((ownership) => ownership.gameId === gameId)?.status ?? null
    }

    public getGroupPersonOwnershipSource(person: GroupPersonWorkspaceType, gameId: number): string | null {
        const source = person.ownership.find((ownership) => ownership.gameId === gameId)?.source
        if (source === 'account_collection') return 'synced from linked collection'
        if (source === 'claimed_import') return 'accepted during claim'
        if (source === 'placeholder_setup') return 'entered by organizer'
        return null
    }

    // One person's game editor open at a time, with a title filter.
    public readonly editingGroupPersonId = signal<number | null>(null)
    public readonly groupPersonGameFilter = signal('')

    public toggleGroupPersonEditor(personId: number): void {
        this.groupPersonGameFilter.set('')
        this.editingGroupPersonId.update((current) => (current === personId ? null : personId))
    }

    /** Games this person owns, by title, for the compact card. */
    public getGroupPersonOwnedGames(person: GroupPersonWorkspaceType): Array<GameCompleteType> {
        const owned = new Set(person.ownership.filter((ownership) => ownership.status === 'asserted').map((ownership) => ownership.gameId))
        return this.groupPersonAvailableGamesComputed().filter((game) => owned.has(game.id))
    }

    /** Editor rows: filtered by title, games with something recorded first. */
    public getGroupPersonEditorGames(person: GroupPersonWorkspaceType): Array<GameCompleteType> {
        const query = this.groupPersonGameFilter().trim().toLowerCase()
        const recorded = (gameId: number) =>
            this.getGroupPersonOwnershipStatus(person, gameId) !== null || this.getGroupPersonPreference(person, gameId) !== null
        return this.groupPersonAvailableGamesComputed()
            .filter((game) => !query || (game.titleTranslations.en || game.title || '').toLowerCase().includes(query))
            .sort(
                (a, b) =>
                    Number(recorded(b.id)) - Number(recorded(a.id)) ||
                    (a.titleTranslations.en || '').localeCompare(b.titleTranslations.en || ''),
            )
    }

    public getGroupPersonOwnedGameCount(person: GroupPersonWorkspaceType): number {
        return person.ownership.filter((ownership) => ownership.status === 'asserted').length
    }

    public async setGroupPersonOwnership(person: GroupPersonWorkspaceType, gameId: number, event: Event): Promise<void> {
        const groupId = this.groupData$()?.id
        if (!groupId || !this.isGroupOwnerComputed() || this.groupPersonMutationId()) return

        const status = (event.target as HTMLSelectElement).value
        if (!['asserted', 'rejected', 'disputed'].includes(status)) return

        this.groupPersonMutationId.set(person.person.id)
        try {
            await firstValueFrom(
                this.api.updateGroupPersonOwnership(groupId, person.person.id, gameId, status as 'asserted' | 'rejected' | 'disputed'),
            )
            this.loadGroupPeople(groupId)
        } catch {
            this.toastService.error('Could not update this person’s game ownership.')
        } finally {
            this.groupPersonMutationId.set(null)
        }
    }

    public getGroupPersonPreference(person: GroupPersonWorkspaceType, gameId: number): GroupPersonPreferenceType['preference'] | null {
        return person.preferences.find((preference) => preference.gameId === gameId)?.preference ?? null
    }

    public getGroupPersonPreferenceSource(person: GroupPersonWorkspaceType, gameId: number): string | null {
        const source = person.preferences.find((preference) => preference.gameId === gameId)?.source
        if (source === 'account_profile') return 'synced from account profile'
        if (source === 'claimed_import') return 'accepted during claim'
        if (source === 'placeholder_setup') return 'entered by organizer'
        return null
    }

    public async setGroupPersonPreference(person: GroupPersonWorkspaceType, gameId: number, event: Event): Promise<void> {
        const groupId = this.groupData$()?.id
        if (!groupId || !this.isGroupOwnerComputed() || this.groupPersonMutationId()) return

        const preference = (event.target as HTMLSelectElement).value
        if (!['', 'favorite', 'like', 'neutral', 'avoid'].includes(preference)) return

        this.groupPersonMutationId.set(person.person.id)
        try {
            if (preference === '') {
                await firstValueFrom(this.api.deleteGroupPersonPreference(groupId, person.person.id, gameId))
            } else {
                await firstValueFrom(
                    this.api.updateGroupPersonPreference(
                        groupId,
                        person.person.id,
                        gameId,
                        preference as GroupPersonPreferenceType['preference'],
                    ),
                )
            }
            this.loadGroupPeople(groupId)
        } catch {
            this.toastService.error('Could not update this person’s game preference.')
        } finally {
            this.groupPersonMutationId.set(null)
        }
    }

    public async joinAsNewGroupPerson(): Promise<void> {
        const groupId = this.groupData$()?.id
        if (!groupId || this.currentUserHasGroupPersonComputed() || this.groupPersonMutationId()) return

        this.groupPersonMutationId.set(-1)
        try {
            await firstValueFrom(this.api.joinGroupAsNewPerson(groupId))
            this.toastService.success('You joined this group as a new person.')
            this.loadGroupPeople(groupId)
        } catch {
            this.toastService.error('Could not add you as a group person.')
        } finally {
            this.groupPersonMutationId.set(null)
        }
    }

    public isCurrentUserInterested(entry: GroupAcquisitionEntryType): boolean {
        const currentUserId = this.currentUser$()?.id
        return currentUserId !== undefined && entry.interestedBy.some((member) => member.id === currentUserId)
    }

    public getInterestNames(entry: GroupAcquisitionEntryType): string {
        const names = entry.interestedBy.map((member) => member.displayName || member.username)
        if (names.length <= 3) return names.join(', ')
        return `${names.slice(0, 3).join(', ')} + ${names.length - 3} more`
    }

    public getAcquisitionDecisionLabel(status: GroupAcquisitionEntryType['decisionStatus']): string {
        switch (status) {
            case 'planned':
                return 'Plan to acquire'
            case 'not_now':
                return 'Not now'
            default:
                return 'Open for discussion'
        }
    }

    public async updateAcquisitionDecision(gameId: number, status: GroupAcquisitionEntryType['decisionStatus']): Promise<void> {
        const groupId = this.groupData$()?.id
        if (!groupId || !this.isGroupOwnerComputed() || this.acquisitionDecisionMutationGameId()) return

        this.acquisitionDecisionMutationGameId.set(gameId)
        this.acquisitionDecisionErrors.update((errors) => {
            const nextErrors = { ...errors }
            delete nextErrors[gameId]
            return nextErrors
        })
        try {
            await firstValueFrom(this.api.updateGroupAcquisitionDecision(groupId, gameId, status))
            this.toastService.success(`Acquisition decision updated: ${this.getAcquisitionDecisionLabel(status)}.`)
            this.loadAcquisitionBoard(groupId)
        } catch {
            this.acquisitionDecisionErrors.update((errors) => ({ ...errors, [gameId]: 'Could not update this group decision. Try again.' }))
            this.toastService.error('Could not update the group acquisition decision.')
        } finally {
            this.acquisitionDecisionMutationGameId.set(null)
        }
    }

    public async addAcquisitionInterest(gameId: number): Promise<void> {
        const groupId = this.groupData$()?.id
        if (!groupId || this.acquisitionMutationGameId()) return

        this.acquisitionMutationGameId.set(gameId)
        this.acquisitionMutationErrors.update((errors) => {
            const nextErrors = { ...errors }
            delete nextErrors[gameId]
            return nextErrors
        })
        try {
            await firstValueFrom(this.api.addGroupAcquisitionInterest(groupId, gameId))
            this.toastService.success('Your interest was added to the group shortlist.')
            this.loadAcquisitionBoard(groupId)
        } catch {
            this.acquisitionMutationErrors.update((errors) => ({ ...errors, [gameId]: 'Could not add your interest. Try again.' }))
            this.toastService.error('Could not add your interest to the group board.')
        } finally {
            this.acquisitionMutationGameId.set(null)
        }
    }

    public async removeAcquisitionInterest(gameId: number): Promise<void> {
        const groupId = this.groupData$()?.id
        if (!groupId || this.acquisitionMutationGameId()) return

        this.acquisitionMutationGameId.set(gameId)
        this.acquisitionMutationErrors.update((errors) => {
            const nextErrors = { ...errors }
            delete nextErrors[gameId]
            return nextErrors
        })
        try {
            await firstValueFrom(this.api.removeGroupAcquisitionInterest(groupId, gameId))
            this.loadAcquisitionBoard(groupId)
        } catch {
            // Keep the last known board visible: a failed removal is an
            // action-level error, not evidence that the board itself vanished.
            this.acquisitionMutationErrors.update((errors) => ({ ...errors, [gameId]: 'Could not remove your interest. Try again.' }))
            this.toastService.error('Could not remove your interest from the group board.')
        } finally {
            this.acquisitionMutationGameId.set(null)
        }
    }

    /** The group's collection worth and who brings what, in Group pulse. A failure says so, with a retry. */
    private loadCollection(groupId: number): void {
        const request = ++this.collectionRequest
        this.collectionLoading.set(true)
        this.collectionError.set(false)
        this.api.getGroupCollection(groupId).subscribe({
            next: (collection) => {
                // An answer for a group this page no longer shows, or for an older retry, is dropped.
                if (!this.isShowing(groupId) || request !== this.collectionRequest) return
                this.collection$.set(collection)
                this.collectionLoading.set(false)
            },
            error: () => {
                if (!this.isShowing(groupId) || request !== this.collectionRequest) return
                this.collection$.set(null)
                this.collectionLoading.set(false)
                this.collectionError.set(true)
            },
        })
    }

    public retryCollection(): void {
        const groupId = this.groupData$()?.id
        if (groupId) this.loadCollection(groupId)
    }

    /** A person's page in this group: members by account, people without an account by their group person. */
    public personLink(groupId: number, person: GroupCollectionPersonType): Array<string | number> {
        return person.accountId !== null
            ? ['/groups', groupId, 'members', person.accountId]
            : ['/groups', groupId, 'people', person.groupPersonId ?? 0]
    }

    public loadInsights(groupId: number): void {
        this.insightsError.set(false)
        this.api.getGroupInsights(groupId).subscribe({
            next: (insights) => this.isShowing(groupId) && this.insights$.set(insights),
            error: () => this.isShowing(groupId) && this.insightsError.set(true),
        })
    }

    /** People without an account or avatar show their initials. */
    public readonly initialsAvatar = initialsAvatar

    /** "3 wins · 7 games · 4 nights" */
    public standingSummary(standing: GroupStandingType): string {
        const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
        return [plural(standing.wins, 'win'), plural(standing.gamesPlayed, 'game'), plural(standing.sessions, 'night')].join(' · ')
    }

    private loadAcquisitionBoard(groupId: number): void {
        this.acquisitionBoardLoading.set(true)
        this.acquisitionBoardError.set(false)
        this.api.getGroupAcquisitionBoard(groupId).subscribe({
            next: (entries) => this.isShowing(groupId) && this.acquisitionBoard$.set(entries),
            error: () => {
                if (!this.isShowing(groupId)) return
                this.acquisitionBoardLoading.set(false)
                this.acquisitionBoardError.set(true)
                this.acquisitionBoard$.set([])
            },
            complete: () => this.isShowing(groupId) && this.acquisitionBoardLoading.set(false),
        })
    }

    /** The badge on a group person: no account, a member, or someone no longer in the group. */
    public groupPersonBadge(person: GroupPersonWorkspaceType['person']): string {
        if (person.standing === 'deleted') return 'Deleted account'
        if (person.standing === 'left') return person.kind === 'linked' ? 'Left the group' : 'Archived'
        return person.kind === 'linked' ? 'Member' : 'No account yet'
    }

    public loadGroupPeople(groupId: number): void {
        this.groupPeopleLoading.set(true)
        this.groupPeopleError.set(false)
        this.api.getGroupPeople(groupId, this.includeArchivedGroupPeople()).subscribe({
            next: (response) => this.isShowing(groupId) && this.groupPeople$.set(response.people),
            error: () => {
                if (!this.isShowing(groupId)) return
                this.groupPeopleLoading.set(false)
                this.groupPeopleError.set(true)
                this.groupPeople$.set([])
            },
            complete: () => this.isShowing(groupId) && this.groupPeopleLoading.set(false),
        })
        this.loadGroupPersonCatalog(groupId)
    }

    private loadGroupPersonCatalog(groupId: number): void {
        this.api.getGroupPersonCatalog(groupId).subscribe({
            next: (games) => this.isShowing(groupId) && this.groupPersonCatalog$.set(games),
            error: () => this.isShowing(groupId) && this.groupPersonCatalog$.set([]),
        })
    }

    private loadGroupHistory(userId: number, groupId: number): void {
        this.isLoading.set(true)
        this.groupHistoryError.set(false)
        this.api.getGroupMeetings(userId, groupId).subscribe({
            next: (groupMeetings) => {
                if (this.isShowing(groupId)) this.groupHistory$.set(groupMeetings)
                this.dataService.groupHistoryByGroupId.set({
                    ...this.dataService.groupHistoryByGroupId(),
                    [groupId]: groupMeetings,
                })
            },
            error: (error) => {
                console.error(error)
                if (!this.isShowing(groupId)) return
                this.isLoading.set(false)
                this.groupHistoryError.set(true)
                // Keep the cache unset so a retry can request the data again.
                this.groupHistory$.set([])
            },
            complete: () => this.isShowing(groupId) && this.isLoading.set(false),
        })
    }

    /** An answer for another group, asked for before the switcher moved on, must not land on this one. */
    private isShowing(groupId: number): boolean {
        return this.routeGroupId() === groupId
    }

    // #region Getters

    get invitationsList(): InvitationWithAccountsData[] {
        const groupData = this.groupData$()
        if (!groupData) {
            return []
        }
        return this.invitationsGroupIndex$()[groupData.id] || []
    }

    // #region Button Clicks

    onClickSelectAll(): void {
        const groupData = this.groupData$()
        if (!groupData) return

        const allMembersSelected = this.selectedMembers$().length === groupData.members.length
        this.selectedMembers$.set(allMembersSelected ? [] : groupData.members.map((member) => member.id))
    }

    onClickMeeting(meetId: number): void {
        this.router.navigate(['/sessions', meetId])
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
        this.router.navigate(['/groups', this.groupData$()?.id, 'edit'])
    }

    onClickLeaveGroup() {
        if (this.isGroupOwnerComputed() || !this.groupData$()) return
        this.isLeaveDialogOpen.set(true)
    }

    public cancelLeaveGroup(): void {
        if (this.isLeavingGroup()) return
        this.isLeaveDialogOpen.set(false)
    }

    public async confirmLeaveGroup(): Promise<void> {
        const groupId = this.groupData$()?.id
        if (!groupId || this.isGroupOwnerComputed() || this.isLeavingGroup()) return

        this.isLeavingGroup.set(true)
        try {
            await firstValueFrom(this.dataService.leaveGroup(groupId))
            await this.router.navigate(['/dashboard'])
        } finally {
            this.isLeavingGroup.set(false)
        }
    }

    onClickNewMeet(): void {
        this.router.navigate(['/groups', this.groupData$()?.id, 'sessions', 'new'])
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
