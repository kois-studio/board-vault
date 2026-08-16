import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
    public selectedPlannedGameIds: Array<number> = []
    public today = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
    public dateForm = new FormControl(this.today, [
        Validators.required,
        (control) => {
            if (!control.value) return null
            const selectedDate = new Date(control.value)
            const today = new Date(new Date().toISOString().split('T')[0])
            return selectedDate >= today ? null : { futureDate: true }
        },
    ])

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

    togglePlannedGame(gameId: number): void {
        this.selectedPlannedGameIds = this.selectedPlannedGameIds.includes(gameId)
            ? this.selectedPlannedGameIds.filter(id => id !== gameId)
            : [...this.selectedPlannedGameIds, gameId]
    }

    get disableCreateButton() {
        if (!this.dateForm.value) {
            return true
        }

        return this.isCreatingLoading || this.dateForm.invalid
    }

    onClickCreateMeeting() {
        const groupId = this.groupData?.id
        const sessionDate = this.dateForm.value

        if (!groupId || !sessionDate || this.dateForm.invalid) {
            this.dateForm.markAsTouched()
            return
        }

        this.isCreatingLoading = true

        firstValueFrom(
            this.api.scheduleSession({
                groupId,
                sessionDate: new Date(`${sessionDate}T12:00:00`).toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
