import { ChangeDetectorRef, Component, effect, inject, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type {
    GameCompleteType,
    GameResultEntryType,
    GameType,
    GroupPersonWorkspaceType,
    GroupStanding,
    GroupWithMembersAndGames,
    MeetType,
    MeetWithAttendeesAndGamesType,
    PublicUserType,
    UserType,
} from '../../api/api.types'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { type SessionStat, SessionSummaryComponent } from '../../components/session-summary/session-summary.component'
import { ToastService } from '../../components/toast/toast.service'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { DialogDirective } from '../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { StarRatingComponent } from '../../components/ui/star-rating/star-rating.component'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import type { Nullable } from '../../core/types/commons.type'
import { formatWinners, nameWithStanding } from '../../core/utils/historyParticipants'
import { downloadSessionIcs, googleCalendarUrl } from '../../core/utils/sessionCalendar'
import { relativeDay, type SessionDateParts, sessionDateParts } from '../../core/utils/sessionTiming'

/** Someone in this session: a member account, or a group person in sessions recorded with group people. */
export type SessionPerson = {
    /** `a<accountId>` or `p<groupPersonId>`, the same key the results use. */
    key: string
    accountId: number | null
    personId: number | null
    /** With "(left)" for someone who left the group. */
    displayName: string
    avatar: PublicUserType['avatar']
    /** Past sessions keep people who left or deleted their account (ADR-0018). */
    standing: GroupStanding
}

type ResultDraft = Record<string, { isWinner: boolean; score: number | null }>

const resultKey = (entry: Pick<GameResultEntryType, 'accountId' | 'groupPersonId'>): string =>
    entry.accountId !== null ? `a${entry.accountId}` : `p${entry.groupPersonId}`

@Component({
    imports: [
        ButtonComponent,
        SessionSummaryComponent,
        RouterLink,
        CustomDatePipe,
        IconComponent,
        ImageProfileComponent,
        ImageBackgroundComponent,
        ContainerWrapperComponent,
        DialogDirective,
        StarRatingComponent,
    ],
    templateUrl: 'meet-view.component.html',
})
export class MeetViewComponent {
    public loaded = false
    public readonly isLoading = signal(true)
    public readonly loadError = signal(false)
    private requestedMeetId: number | null = null

    // DataService data (filled on init -> effect)
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    private userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public groupData: Nullable<(typeof this.userGroups)[number]> = null
    public groupPeople: Array<GroupPersonWorkspaceType> = []
    public groupPersonCatalog: Array<GameCompleteType> = []
    public meetData: Nullable<MeetWithAttendeesAndGamesType> = null
    public meetDataCopyOriginal: Nullable<MeetWithAttendeesAndGamesType> = null // to compare changes

    // Component state
    public gameReviews: Record<GameType['id'], Record<UserType['id'], number>> = {}
    public avgReviewsIndex: Record<GameType['id'], number> = {}
    public lastMeeting: Nullable<MeetType> = null
    public isUpdatingStatus = false
    public isUpdatingRsvp = false
    public isUpdatingAttendance = false
    public isUpdatingShortlist = false
    public isPersistingChanges = false
    public readonly actionError = signal<string | null>(null)
    public readonly pendingStatus = signal<'active' | 'completed' | 'cancelled' | null>(null)
    public plannedGameIdsDraft: Array<number> = []
    public postSessionRatings: Record<number, number> = {}
    public savingPostSessionRatings: Record<number, boolean> = {}
    public isEditingInvites = false
    public editingResultsGameId: number | null = null
    public resultsDraft: ResultDraft = {}
    public isSavingResults = false
    // Components are OnPush by default: state set after an await needs a nudge to render.
    private readonly changeDetector = inject(ChangeDetectorRef)

    constructor(
        private readonly api: Api,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
        private readonly toastService: ToastService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()

            // Get Meet Details
            const sessionId = Number.parseInt(this.route.snapshot.paramMap.get('sessionId') || '', 10)
            if (!this.userData || this.userGroups.length === 0 || Number.isNaN(sessionId) || this.requestedMeetId === sessionId) {
                return
            }

            this.requestedMeetId = sessionId
            void this.loadMeetDetails(sessionId)
        })
    }

    public retryLoad(): void {
        const sessionId = Number.parseInt(this.route.snapshot.paramMap.get('sessionId') || '', 10)
        if (Number.isNaN(sessionId)) return

        this.requestedMeetId = null
        this.loaded = false
        this.loadError.set(false)
        this.isLoading.set(true)
        this.requestedMeetId = sessionId
        void this.loadMeetDetails(sessionId)
    }

    private async loadMeetDetails(meetId: number): Promise<void> {
        this.isLoading.set(true)
        this.loadError.set(false)
        try {
            // Get Meet Details
            this.meetData = await firstValueFrom(this.api.getSessionDetailsById(meetId))
            this.plannedGameIdsDraft = [...this.meetData.plannedGames]
            this.meetDataCopyOriginal = JSON.parse(JSON.stringify(this.meetData))

            if (!this.meetData) {
                this.loadError.set(true)
                return
            }

            // Group Data
            const groupData = this.userGroups.find((group) => group.id === this.meetData?.groupId)

            if (!this.userData || !groupData) {
                this.loadError.set(true)
                return
            }

            this.groupData = groupData

            if (typeof this.api.getGroupPeople === 'function') {
                // Archived and former people too: the session may have them, and keeps them (ADR-0018).
                this.groupPeople = (await firstValueFrom(this.api.getGroupPeople(this.meetData.groupId, true))).people
            }
            if (this.isGroupPersonSession && typeof this.api.getGroupPersonCatalog === 'function') {
                this.groupPersonCatalog = await firstValueFrom(this.api.getGroupPersonCatalog(this.meetData.groupId))
            }

            // After getting group data, index all reviews by gameId
            this.#indexReviews(groupData)

            this.loaded = true
        } catch {
            this.loaded = false
            this.loadError.set(true)
        } finally {
            this.changeDetector.markForCheck()
            this.isLoading.set(false)
        }
    }

    #indexReviews(groupData: GroupWithMembersAndGames): void {
        // Step 1: Index all reviews by gameId and userId
        for (const member of groupData.members) {
            for (const review of member.reviews) {
                const gameReviews = this.gameReviews[review.gameId] ?? {}
                gameReviews[member.id] = review.review
                this.gameReviews[review.gameId] = gameReviews
            }
        }

        // Step 2: Calculate average review for each game
        for (const [gameId, value] of Object.entries(this.gameReviews)) {
            const reviews = Object.values(value)
            const sum = reviews.reduce((acc, review) => acc + review, 0)
            this.avgReviewsIndex[Number(gameId)] = Number((sum / reviews.length).toFixed(2))
        }
    }

    // #region Getters

    get canManageLifecycle(): boolean {
        return Boolean(this.meetData && this.userData && this.meetData.createdBy === this.userData.id)
    }

    get canEditSession(): boolean {
        return this.meetData?.status === 'scheduled' || this.meetData?.status === 'active'
    }

    get attendeeCount(): number {
        return this.isGroupPersonSession ? (this.meetData?.participants?.length ?? 0) : (this.meetData?.attendees.length ?? 0)
    }

    get isGroupPersonSession(): boolean {
        return (this.meetData?.participants?.length ?? 0) > 0
    }

    get playedGamesCount(): number {
        return this.meetData?.playedGames.length ?? 0
    }

    get skippedGamesCount(): number {
        return this.meetData?.skippedGames.length ?? 0
    }

    get remainingPlannedGamesCount(): number {
        if (!this.meetData) return 0
        return this.meetData.plannedGames.filter((gameId) => !this.meetData?.playedGames.includes(gameId)).length
    }

    get attendedCount(): number {
        return this.isGroupPersonSession
            ? (this.meetData?.participantStatuses?.filter((attendee) => attendee.attendanceStatus === 'attended').length ?? 0)
            : (this.meetData?.attendeeStatuses.filter((attendee) => attendee.attendanceStatus === 'attended').length ?? 0)
    }

    /** The counts under the session title. */
    get sessionStats(): Array<SessionStat> {
        const upcoming = this.meetData?.status === 'scheduled' || this.meetData?.status === 'active'
        return [
            { label: 'Invited', value: this.attendeeCount },
            upcoming ? { label: 'Going', value: this.goingCount } : { label: 'Attended', value: this.attendedCount },
            { label: 'Shortlisted', value: this.plannedGames.length },
            { label: 'Played', value: this.playedGamesCount },
            ...(this.skippedGamesCount > 0 ? [{ label: 'Skipped', value: this.skippedGamesCount }] : []),
        ]
    }

    get dateParts(): SessionDateParts | null {
        return this.meetData ? sessionDateParts(this.meetData) : null
    }

    get relativeDate(): string {
        return this.meetData ? relativeDay(this.meetData.meetDate) : ''
    }

    // #region People

    /** Everyone invited, in group order. */
    get invitedPeople(): Array<SessionPerson> {
        if (!this.meetData) return []
        if (this.isGroupPersonSession) {
            const invited = new Set(this.meetData.participants ?? [])
            return this.groupPeople.filter((person) => invited.has(person.person.id)).map((person) => this.#fromGroupPerson(person))
        }
        const invited = new Set(this.meetData.attendees)
        return (this.groupData?.members ?? []).filter((member) => invited.has(member.id)).map((member) => this.#fromAccount(member))
    }

    /** Everyone who could be invited: the members, or the group people. */
    get invitablePeople(): Array<SessionPerson> {
        if (this.isGroupPersonSession) {
            return this.groupPeople
                .filter((person) => person.person.status !== 'archived' && (person.person.standing ?? 'member') === 'member')
                .map((person) => this.#fromGroupPerson(person))
        }
        return (this.groupData?.members ?? []).map((member) => this.#fromAccount(member))
    }

    isInvited(person: SessionPerson): boolean {
        return person.personId !== null
            ? Boolean(this.meetData?.participants?.includes(person.personId))
            : Boolean(person.accountId !== null && this.meetData?.attendees.includes(person.accountId))
    }

    toggleInvite(person: SessionPerson): void {
        if (person.personId !== null) void this.onClickGroupPerson(person.personId)
        else if (person.accountId !== null) void this.onClickMember(person.accountId)
    }

    isInviteLocked(person: SessionPerson): boolean {
        return person.personId !== null
            ? this.isGroupPersonAttendeeRemovalBlocked(person.personId)
            : person.accountId !== null && this.isAttendeeRemovalBlocked(person.accountId)
    }

    inviteToggleLabel(person: SessionPerson): string {
        return person.personId !== null
            ? this.getGroupPersonToggleLabel(person.personId)
            : this.getAttendeeToggleLabel(person.accountId ?? 0)
    }

    rsvpOf(person: SessionPerson): 'pending' | 'accepted' | 'declined' {
        const status =
            person.personId !== null
                ? this.meetData?.participantStatuses?.find((attendee) => attendee.groupPersonId === person.personId)?.rsvpStatus
                : this.meetData?.attendeeStatuses.find((attendee) => attendee.accountId === person.accountId)?.rsvpStatus
        return status ?? 'pending'
    }

    rsvpLabel(person: SessionPerson): string {
        const rsvp = this.rsvpOf(person)
        if (rsvp === 'accepted') return 'Going'
        if (rsvp === 'declined') return 'Can’t make it'
        // Group people without an account can't answer; the organizer speaks for them.
        return person.personId !== null && person.accountId === null ? 'No reply needed' : 'Hasn’t answered'
    }

    attended(person: SessionPerson): boolean {
        return person.personId !== null
            ? this.getGroupPersonAttendanceStatus(person.personId) === 'Was there'
            : this.getMemberAttendanceStatus(person.accountId ?? 0) === 'Was there'
    }

    toggleAttended(person: SessionPerson): void {
        if (person.personId !== null) void this.toggleGroupPersonAttendance(person.personId)
        else if (person.accountId !== null) void this.toggleAttendance(person.accountId)
    }

    get goingCount(): number {
        return this.invitedPeople.filter((person) => this.rsvpOf(person) === 'accepted').length
    }

    // #region Players and results

    /** The people recorded for a played game. */
    playersOf(gameId: number): Array<SessionPerson> {
        if (this.isGroupPersonSession) {
            const ids = new Set(this.getGameParticipantPersonIds(gameId))
            return this.invitedPeople.filter((person) => person.personId !== null && ids.has(person.personId))
        }
        const ids = new Set(this.getGameParticipantIds(gameId))
        return this.invitedPeople.filter((person) => person.accountId !== null && ids.has(person.accountId))
    }

    isPlayer(gameId: number, person: SessionPerson): boolean {
        return person.personId !== null
            ? this.isGroupPersonGameParticipant(gameId, person.personId)
            : this.isGameParticipant(gameId, person.accountId ?? 0)
    }

    togglePlayer(gameId: number, person: SessionPerson): void {
        if (person.personId !== null) void this.toggleGroupPersonGameParticipant(gameId, person.personId)
        else if (person.accountId !== null) void this.toggleGameParticipant(gameId, person.accountId)
    }

    /** Anyone in the group can record results once games are being played. */
    get canRecordResults(): boolean {
        return this.meetData?.status === 'active' || this.meetData?.status === 'completed'
    }

    resultsOf(gameId: number): Array<GameResultEntryType> {
        return this.meetData?.gameResults?.find((game) => game.gameId === gameId)?.results ?? []
    }

    winnersOf(gameId: number): Array<SessionPerson> {
        const winners = new Set(
            this.resultsOf(gameId)
                .filter((result) => result.isWinner)
                .map(resultKey),
        )
        return this.playersOf(gameId).filter((person) => winners.has(person.key))
    }

    /** Players with a score, highest first. */
    scoresOf(gameId: number): Array<{ person: SessionPerson; score: number }> {
        const scores = new Map(
            this.resultsOf(gameId)
                .filter((result) => result.score !== null)
                .map((result) => [resultKey(result), result.score as number]),
        )
        return this.playersOf(gameId)
            .filter((person) => scores.has(person.key))
            .map((person) => ({ person, score: scores.get(person.key) as number }))
            .sort((a, b) => b.score - a.score)
    }

    namesOf(people: Array<SessionPerson>): string {
        return people.map((person) => person.displayName).join(', ')
    }

    winnersSummary(gameId: number): string {
        return formatWinners(this.winnersOf(gameId).map((person) => person.displayName))
    }

    startEditingResults(gameId: number): void {
        const results = new Map(this.resultsOf(gameId).map((result) => [resultKey(result), result]))
        this.resultsDraft = Object.fromEntries(
            this.playersOf(gameId).map((person) => {
                const result = results.get(person.key)
                return [person.key, { isWinner: result?.isWinner ?? false, score: result?.score ?? null }]
            }),
        )
        this.editingResultsGameId = gameId
    }

    cancelEditingResults(): void {
        this.editingResultsGameId = null
        this.resultsDraft = {}
    }

    toggleDraftWinner(key: string): void {
        const entry = this.resultsDraft[key]
        if (entry) entry.isWinner = !entry.isWinner
    }

    setDraftScore(key: string, value: string): void {
        const entry = this.resultsDraft[key]
        if (!entry) return
        const score = Number.parseInt(value, 10)
        entry.score = value.trim() === '' || Number.isNaN(score) ? null : score
    }

    async saveResults(): Promise<void> {
        const gameId = this.editingResultsGameId
        if (!this.meetData || gameId === null || !this.canRecordResults || this.isSavingResults) return

        const results = this.playersOf(gameId)
            .flatMap((person) => {
                const draft = this.resultsDraft[person.key]
                return draft && (draft.isWinner || draft.score !== null) ? [{ person, draft }] : []
            })
            .map(({ person, draft }) => ({
                ...(person.personId !== null ? { groupPersonId: person.personId } : { accountId: person.accountId as number }),
                isWinner: draft.isWinner,
                score: draft.score,
            }))

        this.actionError.set(null)
        this.isSavingResults = true
        try {
            const saved = await firstValueFrom(this.api.updateGameResults(this.meetData.id, gameId, { results }))
            this.meetData.gameResults = [
                ...(this.meetData.gameResults ?? []).filter((game) => game.gameId !== gameId),
                ...(saved.results.length > 0 ? [{ gameId, results: saved.results }] : []),
            ]
            this.cancelEditingResults()
            // Winners show in Play › History and the group page.
            this.dataService.refreshUserHistory()
            this.toastService.success('Results saved.')
        } catch {
            this.actionError.set('Could not save the results. Your changes are still in the form; try again.')
            this.toastService.error('Could not save the results.')
        } finally {
            this.changeDetector.markForCheck()
            this.isSavingResults = false
        }
    }

    // #region Calendar

    get canAddToCalendar(): boolean {
        return this.meetData?.status === 'scheduled' || this.meetData?.status === 'active'
    }

    get googleCalendarLink(): string {
        return this.meetData ? googleCalendarUrl(this.meetData, this.groupData?.name ?? 'Board Vault') : ''
    }

    downloadCalendarFile(): void {
        if (this.meetData) downloadSessionIcs(this.meetData, this.groupData?.name ?? 'Board Vault')
    }

    // #endregion

    gameTitle(game: GameCompleteType): string {
        return game.titleTranslations.en || game.title || 'Untitled game'
    }

    /** Before its date, starting the night asks first: the night is then dated now (#94). */
    public requestStart(): void {
        if (!this.canManageLifecycle || !this.canEditSession || this.isUpdatingStatus) return
        if (this.isDatedInFuture) this.pendingStatus.set('active')
        else void this.updateStatus('active')
    }

    public requestStatusUpdate(status: 'completed' | 'cancelled'): void {
        if (!this.canManageLifecycle || !this.canEditSession || this.isUpdatingStatus) return
        this.pendingStatus.set(status)
    }

    public cancelStatusUpdate(): void {
        this.pendingStatus.set(null)
    }

    /** `status` overrides the requested one: finishing a night with no games offers to cancel it instead. */
    public confirmStatusUpdate(status = this.pendingStatus()): void {
        if (!status) return

        this.pendingStatus.set(null)
        // The dialog has shown that nothing is marked as played, so finishing is confirmed.
        void this.updateStatus(status, status === 'completed' && this.playedGamesCount === 0)
    }

    get isDatedInFuture(): boolean {
        return Boolean(this.meetData && Date.parse(this.meetData.meetDate) > Date.now())
    }

    get currentRsvpStatus(): 'pending' | 'accepted' | 'declined' | null {
        const currentUserId = this.userData?.id
        if (!currentUserId || !this.meetData) return null

        if (this.isGroupPersonSession) {
            const currentPersonId = this.groupPeople.find((person) => person.person.accountId === currentUserId)?.person.id
            return this.meetData.participantStatuses?.find((attendee) => attendee.groupPersonId === currentPersonId)?.rsvpStatus ?? null
        }

        return this.meetData.attendeeStatuses.find((attendee) => attendee.accountId === currentUserId)?.rsvpStatus ?? null
    }

    get canRespondToRsvp(): boolean {
        return Boolean(this.currentRsvpStatus && this.canEditSession)
    }

    get canRecordAttendance(): boolean {
        return Boolean(
            this.meetData &&
                this.userData &&
                this.meetData.createdBy === this.userData.id &&
                (this.meetData.status === 'active' || this.meetData.status === 'completed'),
        )
    }

    get canLeaveFeedback(): boolean {
        if (this.isGroupPersonSession) {
            const currentPersonId = this.groupPeople.find((person) => person.person.accountId === this.userData?.id)?.person.id
            return Boolean(
                this.meetData?.status === 'completed' &&
                    currentPersonId !== undefined &&
                    this.meetData.participantStatuses?.some(
                        (attendee) => attendee.groupPersonId === currentPersonId && attendee.attendanceStatus === 'attended',
                    ),
            )
        }

        return Boolean(
            this.meetData?.status === 'completed' &&
                this.userData &&
                this.meetData.attendeeStatuses.some(
                    (attendee) => attendee.accountId === this.userData?.id && attendee.attendanceStatus === 'attended',
                ),
        )
    }

    get playedGameDetails(): Array<GameCompleteType & { active: boolean }> {
        if (!this.meetData) return []
        const gamesById = new Map(this.totalGames.map((game) => [game.id, game]))
        return this.meetData.playedGames
            .map((gameId) => gamesById.get(gameId))
            .filter((game): game is GameCompleteType & { active: boolean } => game !== undefined)
    }

    getGameParticipantIds(gameId: number): Array<number> {
        const recorded = this.meetData?.playedGameParticipants.find((game) => game.gameId === gameId)?.participantIds
        if (recorded) return recorded

        const attendedIds = this.meetData?.attendeeStatuses
            .filter((attendee) => attendee.attendanceStatus === 'attended')
            .map((attendee) => attendee.accountId)
        return attendedIds && attendedIds.length > 0 ? attendedIds : [...(this.meetData?.attendees ?? [])]
    }

    getGameParticipantPersonIds(gameId: number): Array<number> {
        const recorded = this.meetData?.playedGamePersonParticipants?.find((game) => game.gameId === gameId)?.participantIds
        if (recorded) return recorded

        const attendedIds = this.meetData?.participantStatuses
            ?.filter((attendee) => attendee.attendanceStatus === 'attended')
            .map((attendee) => attendee.groupPersonId)
        return attendedIds && attendedIds.length > 0 ? attendedIds : [...(this.meetData?.participants ?? [])]
    }

    isGameParticipant(gameId: number, memberId: number): boolean {
        return this.getGameParticipantIds(gameId).includes(memberId)
    }

    isGroupPersonGameParticipant(gameId: number, personId: number): boolean {
        return this.getGameParticipantPersonIds(gameId).includes(personId)
    }

    getMyRating(gameId: number): number | null {
        return this.postSessionRatings[gameId] ?? this.dataService.userReviews().find((review) => review.gameId === gameId)?.review ?? null
    }

    async savePostSessionRating(gameId: number, review: number): Promise<void> {
        if (!this.userData || !this.canLeaveFeedback || this.savingPostSessionRatings[gameId]) return

        this.savingPostSessionRatings[gameId] = true
        try {
            await firstValueFrom(this.api.saveGameReview(this.userData.id, gameId, review))
            this.postSessionRatings[gameId] = review
            this.dataService.refreshGameReviews()
            this.toastService.success('Your group rating was saved.')
        } catch {
            this.toastService.error('Could not save your rating.')
        } finally {
            this.changeDetector.markForCheck()
            this.savingPostSessionRatings[gameId] = false
        }
    }

    getMemberAttendanceStatus(memberId: number): string {
        const attendanceStatus = this.meetData?.attendeeStatuses.find((attendee) => attendee.accountId === memberId)?.attendanceStatus
        if (attendanceStatus === 'attended') return 'Was there'
        if (attendanceStatus === 'absent') return 'Was absent'
        return 'Not recorded'
    }

    getGroupPersonAttendanceStatus(personId: number): string {
        const attendanceStatus = this.meetData?.participantStatuses?.find(
            (attendee) => attendee.groupPersonId === personId,
        )?.attendanceStatus
        if (attendanceStatus === 'attended') return 'Was there'
        if (attendanceStatus === 'absent') return 'Was absent'
        return 'Not recorded'
    }

    isGroupPersonAttendeeRemovalBlocked(personId: number): boolean {
        if (!this.meetData?.participants?.includes(personId)) return false
        if (this.meetData.participants.length <= 1) return true
        return Boolean(this.meetData.playedGamePersonParticipants?.some((game) => game.participantIds.includes(personId)))
    }

    getGroupPersonToggleLabel(personId: number): string {
        const person = this.groupPeople.find((candidate) => candidate.person.id === personId)
        const name = person?.person.displayName ?? 'this person'
        if (!this.meetData?.participants?.includes(personId)) return `Add ${name} to session attendees`
        if (this.meetData.participants.length <= 1) return `Keep ${name} as the session attendee`
        if (this.meetData.playedGamePersonParticipants?.some((game) => game.participantIds.includes(personId))) {
            return `Keep ${name} as an attendee because they are recorded for a played game`
        }
        return `Remove ${name} from session attendees`
    }

    isAttendeeRemovalBlocked(memberId: number): boolean {
        if (!this.meetData?.attendees.includes(memberId)) return false
        if (this.meetData.attendees.length <= 1) return true
        return this.meetData.playedGameParticipants.some((game) => game.participantIds.includes(memberId))
    }

    get hasPlayedGameAttendeeLock(): boolean {
        return Boolean(
            this.meetData?.playedGameParticipants.some((game) =>
                game.participantIds.some((memberId) => this.meetData?.attendees.includes(memberId)),
            ),
        )
    }

    getAttendeeToggleLabel(memberId: number): string {
        const member = this.groupData?.members.find((candidate) => candidate.id === memberId)
        const name = member?.displayName || member?.username || 'this member'

        if (!this.meetData?.attendees.includes(memberId)) return `Add ${name} to session attendees`
        if (this.meetData.attendees.length <= 1) return `Keep ${name} as the session attendee`
        if (this.meetData.playedGameParticipants.some((game) => game.participantIds.includes(memberId))) {
            return `Keep ${name} as an attendee because they are recorded for a played game`
        }
        return `Remove ${name} from session attendees`
    }

    async updateStatus(status: 'active' | 'completed' | 'cancelled', noGamesPlayed = false): Promise<void> {
        if (!this.meetData || !this.canManageLifecycle || !this.canEditSession) return

        this.actionError.set(null)
        this.isUpdatingStatus = true
        try {
            const result = await firstValueFrom(
                this.api.updateSessionStatus(this.meetData.id, noGamesPlayed ? { status, noGamesPlayed } : { status }),
            )
            this.meetData.status = result.status
            this.meetData.meetDate = result.sessionDate
            this.meetDataCopyOriginal = JSON.parse(JSON.stringify(this.meetData))
            this.dataService.refreshUserMeets()
            // A completed session joins the history shown in Play › History and on Home.
            if (result.status === 'completed') this.dataService.refreshUserHistory()
            this.toastService.success(`Session marked as ${status}.`)
        } catch {
            this.actionError.set('Could not update the session status. Try again from this page.')
            this.toastService.error('Could not update the session status.')
        } finally {
            this.changeDetector.markForCheck()
            this.isUpdatingStatus = false
        }
    }

    async updateRsvp(rsvpStatus: 'accepted' | 'declined'): Promise<void> {
        if (!this.meetData || !this.canRespondToRsvp || this.isUpdatingRsvp) return

        this.actionError.set(null)
        this.isUpdatingRsvp = true
        try {
            const result = await firstValueFrom(this.api.updateSessionRsvp(this.meetData.id, { rsvpStatus }))
            if (this.isGroupPersonSession) {
                const currentPersonId = this.groupPeople.find((person) => person.person.accountId === this.userData?.id)?.person.id
                const attendeeStatus = this.meetData.participantStatuses?.find((attendee) => attendee.groupPersonId === currentPersonId)
                if (attendeeStatus) attendeeStatus.rsvpStatus = result.rsvpStatus
            } else {
                const attendeeStatus = this.meetData.attendeeStatuses.find((attendee) => attendee.accountId === this.userData?.id)
                if (attendeeStatus) attendeeStatus.rsvpStatus = result.rsvpStatus
            }
            this.toastService.success(result.rsvpStatus === 'accepted' ? 'You are marked as going.' : 'Your RSVP was declined.')
        } catch {
            this.actionError.set('Could not save your RSVP. Try again from this page.')
            this.toastService.error('Could not save your RSVP.')
        } finally {
            this.changeDetector.markForCheck()
            this.isUpdatingRsvp = false
        }
    }

    async toggleAttendance(memberId: number): Promise<void> {
        if (!this.meetData || !this.canRecordAttendance || this.isUpdatingAttendance) return

        this.actionError.set(null)
        const previousStatuses = this.meetData.attendeeStatuses.map((attendee) => ({ ...attendee }))
        const attendedIds = this.meetData.attendeeStatuses
            .filter((attendee) => attendee.attendanceStatus === 'attended')
            .map((attendee) => attendee.accountId)
        const nextAttendedIds = attendedIds.includes(memberId) ? attendedIds.filter((id) => id !== memberId) : [...attendedIds, memberId]

        for (const attendee of this.meetData.attendeeStatuses) {
            attendee.attendanceStatus = nextAttendedIds.includes(attendee.accountId) ? 'attended' : 'absent'
        }

        this.isUpdatingAttendance = true
        try {
            await firstValueFrom(this.api.updateSessionAttendance(this.meetData.id, { attendedIds: nextAttendedIds }))
            this.toastService.success('Attendance saved.')
        } catch {
            this.meetData.attendeeStatuses = previousStatuses
            this.actionError.set('Could not save attendance. Your previous attendance state was restored; try again.')
            this.toastService.error('Could not save attendance.')
        } finally {
            this.changeDetector.markForCheck()
            this.isUpdatingAttendance = false
        }
    }

    async toggleGroupPersonAttendance(personId: number): Promise<void> {
        if (!this.meetData || !this.isGroupPersonSession || !this.canRecordAttendance || this.isUpdatingAttendance) return

        this.actionError.set(null)
        const previousStatuses = (this.meetData.participantStatuses ?? []).map((attendee) => ({ ...attendee }))
        const attendedIds = (this.meetData.participantStatuses ?? [])
            .filter((attendee) => attendee.attendanceStatus === 'attended')
            .map((attendee) => attendee.groupPersonId)
        const nextAttendedIds = attendedIds.includes(personId) ? attendedIds.filter((id) => id !== personId) : [...attendedIds, personId]

        for (const attendee of this.meetData.participantStatuses ?? []) {
            attendee.attendanceStatus = nextAttendedIds.includes(attendee.groupPersonId) ? 'attended' : 'absent'
        }

        this.isUpdatingAttendance = true
        try {
            await firstValueFrom(this.api.updateSessionAttendance(this.meetData.id, { attendedPersonIds: nextAttendedIds }))
            this.toastService.success('Attendance saved.')
        } catch {
            this.meetData.participantStatuses = previousStatuses
            this.actionError.set('Could not save attendance. Your previous attendance state was restored; try again.')
            this.toastService.error('Could not save attendance.')
        } finally {
            this.changeDetector.markForCheck()
            this.isUpdatingAttendance = false
        }
    }

    // Collapsed by default: the shortlist editor and games nobody attending owns.
    public isEditingShortlist = false
    public showAllGamesForPlayed = false

    get hiddenPlayableGameCount(): number {
        if (!this.canEditSession) return 0
        return this.totalGames.filter((game) => !game.active && !this.meetData?.playedGames?.includes(game.id)).length
    }

    /** Read-only sessions show only what was played; editable ones show what can be marked. */
    get playedSectionGames(): Array<GameCompleteType & { active: boolean }> {
        const played = (game: GameCompleteType) => Boolean(this.meetData?.playedGames?.includes(game.id))
        if (!this.canEditSession) return this.totalGames.filter(played)
        return this.totalGames.filter((game) => this.showAllGamesForPlayed || game.active || played(game))
    }

    get totalGames(): Array<GameCompleteType & { active: boolean }> {
        const games: Array<GameCompleteType & { active: boolean }> = []

        if (!this.groupData) {
            return []
        }

        if (this.isGroupPersonSession) {
            const selectedPersonIds = new Set(this.meetData?.participants ?? [])
            const availableGameIds = new Set<number>()
            for (const person of this.groupPeople) {
                if (!selectedPersonIds.has(person.person.id)) continue
                for (const ownership of person.ownership) {
                    if (ownership.status === 'asserted') availableGameIds.add(ownership.gameId)
                }
                if (person.person.accountId !== null) {
                    const linkedMember = this.groupData.members.find((member) => member.id === person.person.accountId)
                    for (const game of linkedMember?.games ?? []) availableGameIds.add(game.id)
                }
            }
            const personGames = new Map<number, GameCompleteType & { active: boolean }>()
            for (const game of this.groupPersonCatalog) personGames.set(game.id, { ...game, active: availableGameIds.has(game.id) })
            for (const member of this.groupData.members) {
                for (const game of member.games) {
                    if (!personGames.has(game.id)) personGames.set(game.id, { ...game, active: availableGameIds.has(game.id) })
                }
            }
            return [...personGames.values()].sort((a, b) => {
                const aReview = this.avgReviewsIndex[a.id] ?? -1
                const bReview = this.avgReviewsIndex[b.id] ?? -1
                return bReview - aReview
            })
        }

        for (const member of this.groupData.members) {
            // add the games of the non-selected members as inactive
            if (!this.meetData?.attendees.includes(member.id)) {
                for (const game of member.games) {
                    if (!games.find((g) => g.id === game.id)) {
                        games.push({ ...game, active: false })
                    }
                }
            }
            // add the games of the selected members as active
            else {
                for (const game of member.games) {
                    if (!games.find((g) => g.id === game.id)) {
                        games.push({ ...game, active: true })
                    } else {
                        // if was already added, simply update the active flag
                        const existing = games.find((g) => g.id === game.id)
                        if (existing) existing.active = true
                    }
                }
            }
        }

        return games.sort((a, b) => {
            const a_review = this.avgReviewsIndex[a.id] ?? -1
            const b_review = this.avgReviewsIndex[b.id] ?? -1
            return b_review - a_review
        })
    }

    get plannedGames(): Array<GameCompleteType & { active: boolean }> {
        if (!this.meetData) return []
        const gamesById = new Map(this.totalGames.map((game) => [game.id, game]))
        return this.meetData.plannedGames
            .map((gameId) => gamesById.get(gameId))
            .filter((game): game is GameCompleteType & { active: boolean } => game !== undefined)
    }

    get plannedGameIdsDraftChanged(): boolean {
        return JSON.stringify([...this.plannedGameIdsDraft].sort()) !== JSON.stringify([...(this.meetData?.plannedGames ?? [])].sort())
    }

    isPlannedGame(gameId: number): boolean {
        return this.plannedGameIdsDraft.includes(gameId)
    }

    togglePlannedGame(gameId: number): void {
        if (!this.canManageLifecycle || !this.canEditSession || this.isUpdatingShortlist) return

        this.plannedGameIdsDraft = this.isPlannedGame(gameId)
            ? this.plannedGameIdsDraft.filter((id) => id !== gameId)
            : [...this.plannedGameIdsDraft, gameId]
    }

    async savePlannedGames(): Promise<void> {
        if (!this.meetData || !this.canManageLifecycle || !this.canEditSession || this.isUpdatingShortlist) return

        this.actionError.set(null)
        const previousIds = [...this.meetData.plannedGames]
        this.isUpdatingShortlist = true
        try {
            const result = await firstValueFrom(
                this.api.updateSessionShortlist(this.meetData.id, { plannedGameIds: this.plannedGameIdsDraft }),
            )
            this.meetData.plannedGames = result.plannedGameIds
            this.meetDataCopyOriginal = JSON.parse(JSON.stringify(this.meetData))
            this.toastService.success('Shortlist saved.')
        } catch {
            this.plannedGameIdsDraft = previousIds
            this.actionError.set('Could not save the shortlist. Your previous shortlist is still active; try again.')
            this.toastService.error('Could not save the shortlist.')
        } finally {
            this.changeDetector.markForCheck()
            this.isUpdatingShortlist = false
        }
    }

    get skippedGames(): Array<GameCompleteType & { active: boolean }> {
        if (!this.meetData) return []
        const gamesById = new Map(this.totalGames.map((game) => [game.id, game]))
        return this.meetData.skippedGames
            .map((gameId) => gamesById.get(gameId))
            .filter((game): game is GameCompleteType & { active: boolean } => game !== undefined)
    }

    // #region Button Clicks
    // TODO: rethink the click system, it should be done with a straightforward click(id) instead of so much logic

    async onClickMember(memberId: number): Promise<void> {
        if (!this.meetData || !this.canEditSession || this.isPersistingChanges) {
            return
        }

        if (this.isAttendeeRemovalBlocked(memberId)) {
            this.toastService.error(
                this.meetData.attendees.length <= 1
                    ? 'A session must retain at least one attendee.'
                    : 'Remove this person from played games before removing them from the session.',
            )
            return
        }

        const previousAttendees = [...this.meetData.attendees]
        if (this.meetData.attendees.includes(memberId)) {
            this.meetData.attendees = this.meetData.attendees.filter((id) => id !== memberId)
        } else {
            this.meetData.attendees.push(memberId)
        }

        this.isPersistingChanges = true
        try {
            await this.#saveAttendeesSelection()
        } catch {
            this.meetData.attendees = previousAttendees
        } finally {
            this.changeDetector.markForCheck()
            this.isPersistingChanges = false
        }
    }

    async onClickGroupPerson(personId: number): Promise<void> {
        if (!this.meetData || !this.isGroupPersonSession || !this.canEditSession || this.isPersistingChanges) return

        if (this.isGroupPersonAttendeeRemovalBlocked(personId)) {
            this.toastService.error(
                this.meetData.participants?.length === 1
                    ? 'A session must retain at least one attendee.'
                    : 'Remove this person from played games before removing them from the session.',
            )
            return
        }

        const previousParticipants = [...(this.meetData.participants ?? [])]
        this.meetData.participants = this.meetData.participants?.includes(personId)
            ? this.meetData.participants.filter((id) => id !== personId)
            : [...(this.meetData.participants ?? []), personId]

        this.isPersistingChanges = true
        try {
            await this.#saveAttendeesSelection()
        } catch {
            this.meetData.participants = previousParticipants
        } finally {
            this.changeDetector.markForCheck()
            this.isPersistingChanges = false
        }
    }

    async onClickGame(gameId: number): Promise<void> {
        if (!this.meetData || !this.canEditSession || this.isPersistingChanges) {
            return
        }

        this.actionError.set(null)
        const previousPlayedGames = [...this.meetData.playedGames]
        const previousParticipants = this.meetData.playedGameParticipants.map((game) => ({
            ...game,
            participantIds: [...game.participantIds],
        }))
        const previousPersonParticipants = (this.meetData.playedGamePersonParticipants ?? []).map((game) => ({
            ...game,
            participantIds: [...game.participantIds],
        }))
        if (this.meetData.playedGames.includes(gameId)) {
            this.meetData.playedGames = this.meetData.playedGames.filter((id) => id !== gameId)
            this.meetData.playedGameParticipants = this.meetData.playedGameParticipants.filter((game) => game.gameId !== gameId)
            this.meetData.playedGamePersonParticipants = (this.meetData.playedGamePersonParticipants ?? []).filter(
                (game) => game.gameId !== gameId,
            )
        } else {
            this.meetData.playedGames.push(gameId)
            if (this.isGroupPersonSession) {
                this.meetData.playedGamePersonParticipants = [
                    ...(this.meetData.playedGamePersonParticipants ?? []),
                    { gameId, participantIds: this.getGameParticipantPersonIds(gameId) },
                ]
            } else {
                this.meetData.playedGameParticipants = [
                    ...this.meetData.playedGameParticipants,
                    { gameId, participantIds: this.getGameParticipantIds(gameId) },
                ]
            }
        }

        this.isPersistingChanges = true
        try {
            await this.#saveGamesPlayedSelection()
        } catch {
            this.meetData.playedGames = previousPlayedGames
            this.meetData.playedGameParticipants = previousParticipants
            this.meetData.playedGamePersonParticipants = previousPersonParticipants
            this.actionError.set('Could not save the played-game state. Your previous state was restored; try again.')
        } finally {
            this.changeDetector.markForCheck()
            this.isPersistingChanges = false
        }
    }

    async toggleGameParticipant(gameId: number, memberId: number): Promise<void> {
        if (!this.meetData || !this.canEditSession || this.isPersistingChanges || !this.meetData.playedGames.includes(gameId)) return

        const currentParticipantIds = this.getGameParticipantIds(gameId)
        if (currentParticipantIds.includes(memberId) && currentParticipantIds.length === 1) {
            this.toastService.error('Keep at least one participant for each played game.')
            return
        }

        this.actionError.set(null)
        const previousParticipants = this.meetData.playedGameParticipants.map((game) => ({
            ...game,
            participantIds: [...game.participantIds],
        }))
        const nextParticipantIds = currentParticipantIds.includes(memberId)
            ? currentParticipantIds.filter((id) => id !== memberId)
            : [...currentParticipantIds, memberId]
        this.meetData.playedGameParticipants = [
            ...this.meetData.playedGameParticipants.filter((game) => game.gameId !== gameId),
            { gameId, participantIds: nextParticipantIds },
        ]

        this.isPersistingChanges = true
        try {
            await this.#saveGamesPlayedSelection()
        } catch {
            this.meetData.playedGameParticipants = previousParticipants
            this.actionError.set('Could not save the played-game participants. Your previous state was restored; try again.')
            this.toastService.error('Could not save the played game changes.')
        } finally {
            this.changeDetector.markForCheck()
            this.isPersistingChanges = false
        }
    }

    async toggleGroupPersonGameParticipant(gameId: number, personId: number): Promise<void> {
        if (
            !this.meetData ||
            !this.isGroupPersonSession ||
            !this.canEditSession ||
            this.isPersistingChanges ||
            !this.meetData.playedGames.includes(gameId)
        )
            return

        const currentParticipantIds = this.getGameParticipantPersonIds(gameId)
        if (currentParticipantIds.includes(personId) && currentParticipantIds.length === 1) {
            this.toastService.error('Keep at least one participant for each played game.')
            return
        }

        this.actionError.set(null)
        const previousParticipants = (this.meetData.playedGamePersonParticipants ?? []).map((game) => ({
            ...game,
            participantIds: [...game.participantIds],
        }))
        const nextParticipantIds = currentParticipantIds.includes(personId)
            ? currentParticipantIds.filter((id) => id !== personId)
            : [...currentParticipantIds, personId]
        this.meetData.playedGamePersonParticipants = [
            ...(this.meetData.playedGamePersonParticipants ?? []).filter((game) => game.gameId !== gameId),
            { gameId, participantIds: nextParticipantIds },
        ]

        this.isPersistingChanges = true
        try {
            await this.#saveGamesPlayedSelection()
        } catch {
            this.meetData.playedGamePersonParticipants = previousParticipants
            this.actionError.set('Could not save the played-game participants. Your previous state was restored; try again.')
            this.toastService.error('Could not save the played game changes.')
        } finally {
            this.changeDetector.markForCheck()
            this.isPersistingChanges = false
        }
    }

    // #region private methods

    #fromAccount(member: PublicUserType): SessionPerson {
        return {
            key: `a${member.id}`,
            accountId: member.id,
            personId: null,
            displayName: member.displayName || member.username,
            avatar: member.avatar,
            standing: 'member',
        }
    }

    #fromGroupPerson({ person }: GroupPersonWorkspaceType): SessionPerson {
        const linked = person.accountId === null ? undefined : this.groupData?.members.find((member) => member.id === person.accountId)
        const standing = person.standing ?? 'member'
        return {
            key: `p${person.id}`,
            accountId: person.accountId,
            personId: person.id,
            displayName: nameWithStanding(person.displayName, standing),
            standing,
            avatar: person.avatar ??
                linked?.avatar ?? {
                    type: 'initials',
                    initials: initialsOf(person.displayName),
                    backgroundColor: '#64748b',
                    iconName: null,
                    emoji: null,
                },
        }
    }

    /** Drops results the server deleted with their player, so the page matches it without a reload. */
    #pruneResults(): void {
        if (!this.meetData) return
        const meet = this.meetData
        meet.gameResults = (meet.gameResults ?? [])
            .filter((game) => meet.playedGames.includes(game.gameId))
            .map((game) => {
                const accounts = new Set(meet.playedGameParticipants.find((entry) => entry.gameId === game.gameId)?.participantIds ?? [])
                const people = new Set(
                    meet.playedGamePersonParticipants?.find((entry) => entry.gameId === game.gameId)?.participantIds ?? [],
                )
                return {
                    gameId: game.gameId,
                    results: game.results.filter((result) =>
                        result.accountId !== null ? accounts.has(result.accountId) : people.has(result.groupPersonId as number),
                    ),
                }
            })
            .filter((game) => game.results.length > 0)
    }

    async #saveAttendeesSelection(): Promise<void> {
        if (!this.meetData || !this.meetDataCopyOriginal) {
            return
        }

        const result = await firstValueFrom(
            this.api.updateSessionAttendees(
                this.meetData.id,
                this.isGroupPersonSession ? { groupPersonIds: this.meetData.participants ?? [] } : { attendeeIds: this.meetData.attendees },
            ),
        )

        // update the original copy for future comparisons
        this.meetDataCopyOriginal.attendees = [...this.meetData.attendees]
        this.meetDataCopyOriginal.participants = [...(this.meetData.participants ?? [])]
        if (result.groupPersonIds) this.meetData.participants = [...result.groupPersonIds]
    }

    async #saveGamesPlayedSelection(): Promise<void> {
        if (!this.meetData || !this.meetDataCopyOriginal) {
            return
        }

        const result = await firstValueFrom(
            this.api.updateSessionPlayedGames(this.meetData.id, {
                playedGameIds: this.meetData.playedGames,
                // Sessions with group people send only participantPersonIds; an empty participantIds is rejected.
                games: this.meetData.playedGames.map((gameId) => ({
                    gameId,
                    ...(this.isGroupPersonSession
                        ? {}
                        : {
                              participantIds:
                                  this.meetData?.playedGameParticipants.find((game) => game.gameId === gameId)?.participantIds ?? [],
                          }),
                    ...(this.isGroupPersonSession
                        ? {
                              participantPersonIds:
                                  this.meetData?.playedGamePersonParticipants?.find((game) => game.gameId === gameId)?.participantIds ?? [],
                          }
                        : {}),
                })),
            }),
        )
        this.meetData.playedGames = result.playedGameIds
        this.meetData.skippedGames = result.skippedGameIds
        this.meetData.playedGameParticipants = result.playedGameParticipants
        this.meetData.playedGamePersonParticipants = result.playedGamePersonParticipants
        this.meetData.plannedGames = this.meetData.plannedGames.filter(
            (gameId) => !result.playedGameIds.includes(gameId) && !result.skippedGameIds.includes(gameId),
        )
        this.#pruneResults()

        // Update the original copy for future comparisons after the server confirms the canonical state.
        this.meetDataCopyOriginal.playedGames = [...result.playedGameIds]
        this.meetDataCopyOriginal.playedGameParticipants = result.playedGameParticipants.map((game) => ({
            ...game,
            participantIds: [...game.participantIds],
        }))
        this.meetDataCopyOriginal.playedGamePersonParticipants = (result.playedGamePersonParticipants ?? []).map((game) => ({
            ...game,
            participantIds: [...game.participantIds],
        }))
        this.meetDataCopyOriginal.plannedGames = [...this.meetData.plannedGames]
        this.meetDataCopyOriginal.skippedGames = [...result.skippedGameIds]
    }
}

function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
}
