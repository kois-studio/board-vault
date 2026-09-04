import { CommonModule } from '@angular/common'
import { Component, effect, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type {
    GameCompleteType,
    GameType,
    GroupWithMembersAndGames,
    MeetType,
    MeetWithAttendeesAndGamesType,
    PublicUserType,
    UserType,
} from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { ToastService } from '../../components/toast/toast.service'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import type { Nullable } from '../../core/types/commons.type'

@Component({
    imports: [CommonModule, RouterLink, CustomDatePipe, CardAccountComponent, ImageBackgroundComponent, ContainerWrapperComponent],
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
    public plannedGameIdsDraft: Array<number> = []
    public postSessionRatings: Record<number, number> = {}
    public savingPostSessionRatings: Record<number, boolean> = {}

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
            const sessionId = Number.parseInt(this.route.snapshot.paramMap.get('sessionId') || '')
            if (!this.userData || this.userGroups.length === 0 || Number.isNaN(sessionId) || this.requestedMeetId === sessionId) {
                return
            }

            this.requestedMeetId = sessionId
            void this.loadMeetDetails(sessionId)
        })
    }

    public retryLoad(): void {
        const sessionId = Number.parseInt(this.route.snapshot.paramMap.get('sessionId') || '')
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

            // After getting group data, index all reviews by gameId
            this.#indexReviews(groupData)

            this.loaded = true
        } catch {
            this.loaded = false
            this.loadError.set(true)
        } finally {
            this.isLoading.set(false)
        }
    }

    #indexReviews(groupData: GroupWithMembersAndGames): void {
        // Step 1: Index all reviews by gameId and userId
        for (const member of groupData.members) {
            for (const review of member.reviews) {
                if (this.gameReviews[review.gameId] === undefined) {
                    this.gameReviews[review.gameId] = {}
                }

                this.gameReviews[review.gameId][member.id] = review.review
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

    get disableSaveAttendees(): boolean {
        if (!this.meetData || !this.meetDataCopyOriginal) {
            return true
        }

        return JSON.stringify(this.meetData.attendees) === JSON.stringify(this.meetDataCopyOriginal.attendees)
    }

    get canManageLifecycle(): boolean {
        return Boolean(this.meetData && this.userData && this.meetData.createdBy === this.userData.id)
    }

    get canEditSession(): boolean {
        return this.meetData?.status === 'scheduled' || this.meetData?.status === 'active'
    }

    get attendeeCount(): number {
        return this.meetData?.attendees.length ?? 0
    }

    get playedGamesCount(): number {
        return this.meetData?.playedGames.length ?? 0
    }

    get attendedCount(): number {
        return this.meetData?.attendeeStatuses.filter((attendee) => attendee.attendanceStatus === 'attended').length ?? 0
    }

    get sessionStatusDescription(): string {
        switch (this.meetData?.status) {
            case 'scheduled':
                return 'This is the plan for your next game night. Update attendees as people confirm.'
            case 'active':
                return 'The session is live. Mark the people and games that actually took part.'
            case 'completed':
                return 'This session is part of your group memory. The record is now read-only.'
            case 'cancelled':
                return 'This session was cancelled and is kept here for context.'
            default:
                return ''
        }
    }

    get sessionHeading(): string {
        switch (this.meetData?.status) {
            case 'scheduled':
                return 'Plan for game night'
            case 'active':
                return 'Game night is live'
            case 'completed':
                return 'Game night memory'
            case 'cancelled':
                return 'Cancelled game night'
            default:
                return 'Game night'
        }
    }

    get attendeeHeading(): string {
        return this.meetData?.status === 'completed' || this.meetData?.status === 'cancelled' ? 'Who was invited?' : 'Who is invited?'
    }

    get attendeeDescription(): string {
        if (this.meetData?.status === 'completed' || this.meetData?.status === 'cancelled') {
            return 'The saved invite list, RSVP, and recorded attendance for this session.'
        }

        return this.canEditSession
            ? 'The organizer manages the invite list. Each person’s RSVP appears below.'
            : 'Invited people and their RSVP for this saved session.'
    }

    get shortlistHeading(): string {
        return this.meetData?.status === 'scheduled' || this.meetData?.status === 'active' ? 'The shortlist' : 'What was shortlisted'
    }

    get playedGamesHeading(): string {
        return this.meetData?.status === 'scheduled' ? 'What gets played?' : 'What was actually played?'
    }

    get playedGamesDescription(): string {
        if (this.meetData?.status === 'scheduled') {
            return 'The organizer can record games during the night. Only games marked as played become part of group history.'
        }

        return this.canEditSession
            ? 'Mark each game as it gets played. This becomes part of your group history.'
            : 'Games recorded in this session.'
    }

    get sessionStatusLabel(): string {
        switch (this.meetData?.status) {
            case 'scheduled':
                return 'Planned'
            case 'active':
                return 'Live now'
            case 'completed':
                return 'Completed'
            case 'cancelled':
                return 'Cancelled'
            default:
                return ''
        }
    }

    get currentRsvpStatus(): 'pending' | 'accepted' | 'declined' | null {
        const currentUserId = this.userData?.id
        if (!currentUserId || !this.meetData) return null

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

    getGameParticipants(gameId: number): Array<PublicUserType> {
        const participantIds = new Set(this.getGameParticipantIds(gameId))
        return (this.groupData?.members ?? []).filter((member) => participantIds.has(member.id))
    }

    isGameParticipant(gameId: number, memberId: number): boolean {
        return this.getGameParticipantIds(gameId).includes(memberId)
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
            this.savingPostSessionRatings[gameId] = false
        }
    }

    getMemberRsvpStatus(memberId: number): string {
        const rsvpStatus = this.meetData?.attendeeStatuses.find((attendee) => attendee.accountId === memberId)?.rsvpStatus
        if (rsvpStatus === 'accepted') return 'Going'
        if (rsvpStatus === 'declined') return 'Can’t make it'
        return 'Awaiting reply'
    }

    getMemberAttendanceStatus(memberId: number): string {
        const attendanceStatus = this.meetData?.attendeeStatuses.find((attendee) => attendee.accountId === memberId)?.attendanceStatus
        if (attendanceStatus === 'attended') return 'Was there'
        if (attendanceStatus === 'absent') return 'Was absent'
        return 'Not recorded'
    }

    async updateStatus(status: 'active' | 'completed' | 'cancelled'): Promise<void> {
        if (!this.meetData || !this.canManageLifecycle || !this.canEditSession) return

        this.isUpdatingStatus = true
        try {
            const result = await firstValueFrom(this.api.updateSessionStatus(this.meetData.id, { status }))
            this.meetData.status = result.status
            this.meetDataCopyOriginal = JSON.parse(JSON.stringify(this.meetData))
            this.dataService.refreshUserMeets()
            this.toastService.success(`Session marked as ${status}.`)
        } catch {
            this.toastService.error('Could not update the session status.')
        } finally {
            this.isUpdatingStatus = false
        }
    }

    async updateRsvp(rsvpStatus: 'accepted' | 'declined'): Promise<void> {
        if (!this.meetData || !this.canRespondToRsvp || this.isUpdatingRsvp) return

        this.isUpdatingRsvp = true
        try {
            const result = await firstValueFrom(this.api.updateSessionRsvp(this.meetData.id, { rsvpStatus }))
            const attendeeStatus = this.meetData.attendeeStatuses.find((attendee) => attendee.accountId === this.userData?.id)
            if (attendeeStatus) attendeeStatus.rsvpStatus = result.rsvpStatus
            this.toastService.success(result.rsvpStatus === 'accepted' ? 'You are marked as going.' : 'Your RSVP was declined.')
        } catch {
            this.toastService.error('Could not save your RSVP.')
        } finally {
            this.isUpdatingRsvp = false
        }
    }

    async toggleAttendance(memberId: number): Promise<void> {
        if (!this.meetData || !this.canRecordAttendance || this.isUpdatingAttendance) return

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
            this.toastService.error('Could not save attendance.')
        } finally {
            this.isUpdatingAttendance = false
        }
    }

    get totalGames(): Array<GameCompleteType & { active: boolean }> {
        const games: Array<GameCompleteType & { active: boolean }> = []

        if (!this.groupData) {
            return []
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
                        const index = games.findIndex((g) => g.id === game.id)
                        games[index].active = true
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
            this.toastService.error('Could not save the shortlist.')
        } finally {
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
            this.isPersistingChanges = false
        }
    }

    async onClickGame(gameId: number): Promise<void> {
        if (!this.meetData || !this.canEditSession || this.isPersistingChanges) {
            return
        }

        const previousPlayedGames = [...this.meetData.playedGames]
        const previousParticipants = this.meetData.playedGameParticipants.map((game) => ({
            ...game,
            participantIds: [...game.participantIds],
        }))
        if (this.meetData.playedGames.includes(gameId)) {
            this.meetData.playedGames = this.meetData.playedGames.filter((id) => id !== gameId)
            this.meetData.playedGameParticipants = this.meetData.playedGameParticipants.filter((game) => game.gameId !== gameId)
        } else {
            this.meetData.playedGames.push(gameId)
            this.meetData.playedGameParticipants = [
                ...this.meetData.playedGameParticipants,
                { gameId, participantIds: this.getGameParticipantIds(gameId) },
            ]
        }

        this.isPersistingChanges = true
        try {
            await this.#saveGamesPlayedSelection()
        } catch {
            this.meetData.playedGames = previousPlayedGames
            this.meetData.playedGameParticipants = previousParticipants
        } finally {
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
        } finally {
            this.isPersistingChanges = false
        }
    }

    // #region private methods

    async #saveAttendeesSelection(): Promise<void> {
        if (!this.groupData || !this.meetData || !this.meetDataCopyOriginal) {
            return
        }

        await firstValueFrom(this.dataService.updateSessionAttendees(this.meetData.id, this.meetData.attendees))

        // update the original copy for future comparisons
        this.meetDataCopyOriginal.attendees = [...this.meetData.attendees]
    }

    async #saveGamesPlayedSelection(): Promise<void> {
        if (!this.meetData || !this.meetDataCopyOriginal) {
            return
        }

        const result = await firstValueFrom(
            this.api.updateSessionPlayedGames(this.meetData.id, {
                playedGameIds: this.meetData.playedGames,
                games: this.meetData.playedGameParticipants,
            }),
        )
        this.meetData.playedGames = result.playedGameIds
        this.meetData.skippedGames = result.skippedGameIds
        this.meetData.playedGameParticipants = result.playedGameParticipants
        this.meetData.plannedGames = this.meetData.plannedGames.filter(
            (gameId) => !result.playedGameIds.includes(gameId) && !result.skippedGameIds.includes(gameId),
        )

        // Update the original copy for future comparisons after the server confirms the canonical state.
        this.meetDataCopyOriginal.playedGames = [...result.playedGameIds]
        this.meetDataCopyOriginal.playedGameParticipants = result.playedGameParticipants.map((game) => ({
            ...game,
            participantIds: [...game.participantIds],
        }))
        this.meetDataCopyOriginal.plannedGames = [...this.meetData.plannedGames]
        this.meetDataCopyOriginal.skippedGames = [...result.skippedGameIds]
    }
}
