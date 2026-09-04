import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
    templateUrl: 'meet-new.component.html',
})
export class MeetNewComponent {
    public isCreatingLoading = false
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    public userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public invitationsGroupIndex: ReturnType<typeof this.dataService.invitationsGroupIndex> = {}

    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupData: null | (typeof this.userGroups)[number] = null
    public selectedAttendeeIds: Array<number> = []
    public selectedPlannedGameIds: Array<number> = []
    public notes = ''
    private didInitializeSelections = false
    public today = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
    public localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    public dateForm = new FormControl(this.today, [
        Validators.required,
        (control) => {
            if (!control.value) return null
            const selectedDate = new Date(control.value)
            const today = new Date(new Date().toISOString().split('T')[0])
            return selectedDate >= today ? null : { futureDate: true }
        },
    ])
    public timeForm = new FormControl('19:00', [Validators.required])

    constructor(
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
        private readonly api: Api,
        private readonly router: Router,
        private readonly toastService: ToastService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()
            this.invitationsGroupIndex = this.dataService.invitationsGroupIndex()

            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
            const groupData = this.userGroups.find((group) => group.id === groupId)

            if (Number.isNaN(groupId) || !this.userData || !groupData) {
                return
            }

            this.groupData = groupData
            if (!this.didInitializeSelections) {
                const requestedAttendees = (this.route.snapshot.queryParamMap.get('attendeeIds') ?? '')
                    .split(',')
                    .map(Number)
                    .filter((accountId) => groupData.members.some((member) => member.id === accountId))
                const requestedGameId = Number(this.route.snapshot.queryParamMap.get('plannedGameId'))

                this.selectedAttendeeIds =
                    requestedAttendees.length > 0 ? [...new Set(requestedAttendees)] : groupData.members.map((member) => member.id)
                this.selectedPlannedGameIds =
                    Number.isInteger(requestedGameId) && this.availableGames.some((game) => game.id === requestedGameId)
                        ? [requestedGameId]
                        : []
                this.didInitializeSelections = true
            }
        })
    }

    get dateClass() {
        if (!this.dateForm.dirty && !this.dateForm.touched) return ''
        return this.dateForm.valid ? 'border-green-500' : 'border-red-500'
    }

    get availableGames(): Array<GameCompleteType> {
        const games = new Map<number, GameCompleteType>()
        for (const member of this.groupData?.members ?? []) {
            for (const game of member.games) {
                games.set(game.id, game)
            }
        }
        return [...games.values()].sort((a, b) => (a.titleTranslations.en ?? a.title).localeCompare(b.titleTranslations.en ?? b.title))
    }

    get selectedAttendeesLabel(): string {
        const total = this.groupData?.members.length ?? 0
        return `${this.selectedAttendeeIds.length} of ${total} members invited`
    }

    get selectedGamesLabel(): string {
        return this.selectedPlannedGameIds.length === 0
            ? 'No games locked in yet'
            : `${this.selectedPlannedGameIds.length} game${this.selectedPlannedGameIds.length === 1 ? '' : 's'} on the shortlist`
    }

    selectAllAttendees(): void {
        this.selectedAttendeeIds = this.groupData?.members.map((member) => member.id) ?? []
    }

    clearAttendees(): void {
        this.selectedAttendeeIds = []
    }

    selectAllGames(): void {
        this.selectedPlannedGameIds = this.availableGames.map((game) => game.id)
    }

    clearGames(): void {
        this.selectedPlannedGameIds = []
    }

    togglePlannedGame(gameId: number): void {
        this.selectedPlannedGameIds = this.selectedPlannedGameIds.includes(gameId)
            ? this.selectedPlannedGameIds.filter((id) => id !== gameId)
            : [...this.selectedPlannedGameIds, gameId]
    }

    toggleAttendee(accountId: number): void {
        this.selectedAttendeeIds = this.selectedAttendeeIds.includes(accountId)
            ? this.selectedAttendeeIds.filter((id) => id !== accountId)
            : [...this.selectedAttendeeIds, accountId]
    }

    get disableCreateButton() {
        if (!this.dateForm.value || !this.timeForm.value) {
            return true
        }

        return this.isCreatingLoading || this.dateForm.invalid || this.timeForm.invalid || this.selectedAttendeeIds.length === 0
    }

    onClickCreateMeeting() {
        const groupId = this.groupData?.id
        const sessionDate = this.dateForm.value
        const sessionTime = this.timeForm.value

        if (!groupId || !sessionDate || !sessionTime || this.dateForm.invalid || this.timeForm.invalid) {
            this.dateForm.markAsTouched()
            this.timeForm.markAsTouched()
            return
        }

        this.isCreatingLoading = true

        firstValueFrom(
            this.api.scheduleSession({
                groupId,
                sessionDate: new Date(`${sessionDate}T${sessionTime}`).toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                notes: this.notes.trim() || undefined,
                attendeeIds: this.selectedAttendeeIds,
                plannedGameIds: this.selectedPlannedGameIds,
            }),
        )
            .then(() => {
                this.dataService.refreshUserMeets()
                this.toastService.success('Session scheduled.')
                return this.router.navigate(['/play/upcoming-sessions'])
            })
            .catch(() => {
                this.toastService.error('Could not schedule the session. Please try again.')
            })
            .finally(() => {
                this.isCreatingLoading = false
            })
    }
}
