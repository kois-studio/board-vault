import { CommonModule } from '@angular/common'
import { Component, effect, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { DataService } from '../../core/services/data.service'
import { SpinnerComponent } from '../../components/ui/spinner/spinner.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import type { GroupWithMembersAndGames, GameCompleteType, UserType, GameReviewDto } from '../../api/api.types'

type SessionStep = 'group' | 'date' | 'attendees' | 'games' | 'matrix'

interface AttendeeSelection {
    user: UserType & {
        joinedAt: string
        games: Array<GameCompleteType>
        reviews: Array<GameReviewDto>
    }
    selected: boolean
}

interface GameSelection {
    game: GameCompleteType
    selected: boolean
}

interface MatrixCell {
    attendeeId: number
    gameId: number
    selected: boolean
}

@Component({
    selector: 'app-log-session-wizard',
    templateUrl: './log-session-wizard.component.html',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SpinnerComponent,
        PageHeaderComponent,
        ContainerWrapperComponent,
    ],
})
export class LogSessionWizardComponent {
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    private readonly dataService = inject(DataService)
    private readonly router = inject(Router)

    public currentUser = this.dataService.currentUser
    public userGroups = this.dataService.userGroups

    // --------------------------------------------------------------------------
    //        WIZARD STATE
    // --------------------------------------------------------------------------
    public currentStep = signal<SessionStep>('group')
    public isLoading = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        STEP 1: GROUP SELECTION
    // --------------------------------------------------------------------------
    public selectedGroup = signal<GroupWithMembersAndGames | null>(null)

    // --------------------------------------------------------------------------
    //        STEP 2: DATE SELECTION
    // --------------------------------------------------------------------------
    public sessionDate = new FormControl('', [
        Validators.required,
        (control) => {
            if (!control.value) return null
            const selectedDate = new Date(control.value)
            const today = new Date(new Date().toISOString().split('T')[0])
            return selectedDate <= today ? null : { futureDate: true }
        },
    ])

    // --------------------------------------------------------------------------
    //        STEP 3: ATTENDEE SELECTION
    // --------------------------------------------------------------------------
    public attendees = signal<AttendeeSelection[]>([])

    // --------------------------------------------------------------------------
    //        STEP 4: GAME SELECTION
    // --------------------------------------------------------------------------
    public games = signal<GameSelection[]>([])

    // --------------------------------------------------------------------------
    //        STEP 5: MATRIX
    // --------------------------------------------------------------------------
    public matrix = signal<MatrixCell[]>([])

    constructor() {
        effect(() => {
            const group = this.selectedGroup()
            if (group) {
                // Initialize attendees from group members
                this.attendees.set(
                    group.members.map(member => ({
                        user: member,
                        selected: false
                    }))
                )

                // Initialize games from all group members' games
                const allGames = new Map<number, GameCompleteType>()
                group.members.forEach(member => {
                    member.games.forEach(game => {
                        if (!allGames.has(game.id)) {
                            allGames.set(game.id, game)
                        }
                    })
                })

                this.games.set(
                    Array.from(allGames.values()).map(game => ({
                        game,
                        selected: false
                    }))
                )
            }
        })

        effect(() => {
            const selectedAttendees = this.attendees().filter(a => a.selected)
            const selectedGames = this.games().filter(g => g.selected)

            // Rebuild matrix when selections change
            const newMatrix: MatrixCell[] = []
            selectedAttendees.forEach(attendee => {
                selectedGames.forEach(game => {
                    newMatrix.push({
                        attendeeId: attendee.user.id,
                        gameId: game.game.id,
                        selected: false
                    })
                })
            })
            this.matrix.set(newMatrix)
        })
    }

    // --------------------------------------------------------------------------
    //        STEP NAVIGATION
    // --------------------------------------------------------------------------
    public canProceedToNextStep(): boolean {
        switch (this.currentStep()) {
            case 'group':
                return this.selectedGroup() !== null
            case 'date':
                return this.sessionDate.valid && this.sessionDate.value !== null
            case 'attendees':
                return this.attendees().some(a => a.selected)
            case 'games':
                return this.games().some(g => g.selected)
            case 'matrix':
                return this.matrix().some(cell => cell.selected)
            default:
                return false
        }
    }

    public nextStep(): void {
        switch (this.currentStep()) {
            case 'group':
                this.currentStep.set('date')
                break
            case 'date':
                this.currentStep.set('attendees')
                break
            case 'attendees':
                this.currentStep.set('games')
                break
            case 'games':
                this.currentStep.set('matrix')
                break
            case 'matrix':
                this.submitSession()
                break
        }
    }

    public previousStep(): void {
        switch (this.currentStep()) {
            case 'date':
                this.currentStep.set('group')
                break
            case 'attendees':
                this.currentStep.set('date')
                break
            case 'games':
                this.currentStep.set('attendees')
                break
            case 'matrix':
                this.currentStep.set('games')
                break
        }
    }

    // --------------------------------------------------------------------------
    //        GROUP SELECTION
    // --------------------------------------------------------------------------
    public selectGroup(group: GroupWithMembersAndGames): void {
        this.selectedGroup.set(group)
    }

    // --------------------------------------------------------------------------
    //        ATTENDEE SELECTION
    // --------------------------------------------------------------------------
    public toggleAttendee(attendeeId: number): void {
        const updatedAttendees = this.attendees().map(attendee =>
            attendee.user.id === attendeeId
                ? { ...attendee, selected: !attendee.selected }
                : attendee
        )
        this.attendees.set(updatedAttendees)
    }

    public selectAllAttendees(): void {
        const updatedAttendees = this.attendees().map(attendee => ({
            ...attendee,
            selected: true
        }))
        this.attendees.set(updatedAttendees)
    }

    public deselectAllAttendees(): void {
        const updatedAttendees = this.attendees().map(attendee => ({
            ...attendee,
            selected: false
        }))
        this.attendees.set(updatedAttendees)
    }

    // --------------------------------------------------------------------------
    //        GAME SELECTION
    // --------------------------------------------------------------------------
    public toggleGame(gameId: number): void {
        const updatedGames = this.games().map(game =>
            game.game.id === gameId
                ? { ...game, selected: !game.selected }
                : game
        )
        this.games.set(updatedGames)
    }

    public selectAllGames(): void {
        const updatedGames = this.games().map(game => ({
            ...game,
            selected: true
        }))
        this.games.set(updatedGames)
    }

    public deselectAllGames(): void {
        const updatedGames = this.games().map(game => ({
            ...game,
            selected: false
        }))
        this.games.set(updatedGames)
    }

    // --------------------------------------------------------------------------
    //        MATRIX OPERATIONS
    // --------------------------------------------------------------------------
    public toggleMatrixCell(attendeeId: number, gameId: number): void {
        const updatedMatrix = this.matrix().map(cell =>
            cell.attendeeId === attendeeId && cell.gameId === gameId
                ? { ...cell, selected: !cell.selected }
                : cell
        )
        this.matrix.set(updatedMatrix)
    }

    public selectAllForAttendee(attendeeId: number): void {
        const updatedMatrix = this.matrix().map(cell =>
            cell.attendeeId === attendeeId
                ? { ...cell, selected: true }
                : cell
        )
        this.matrix.set(updatedMatrix)
    }

    public selectAllForGame(gameId: number): void {
        const updatedMatrix = this.matrix().map(cell =>
            cell.gameId === gameId
                ? { ...cell, selected: true }
                : cell
        )
        this.matrix.set(updatedMatrix)
    }

    public isMatrixCellSelected(attendeeId: number, gameId: number): boolean {
        return this.matrix().some(cell =>
            cell.attendeeId === attendeeId && cell.gameId === gameId && cell.selected
        )
    }

    // --------------------------------------------------------------------------
    //        SUBMISSION
    // --------------------------------------------------------------------------
    private async submitSession(): Promise<void> {
        if (!this.selectedGroup() || !this.sessionDate.value) {
            return
        }

        this.isLoading.set(true)

        try {
            // TODO: Implement the actual API call to create the session
            // This will involve creating a Meet record and multiple MeetAccountGame records

            // For now, just redirect back to play page
            this.router.navigate(['/play'])
        } catch (error) {
            console.error('Failed to submit session:', error)
            // TODO: Show error toast
        } finally {
            this.isLoading.set(false)
        }
    }

    // --------------------------------------------------------------------------
    //        UTILITY METHODS
    // --------------------------------------------------------------------------
    public getStepTitle(): string {
        switch (this.currentStep()) {
            case 'group':
                return 'Select Group'
            case 'date':
                return 'Session Date'
            case 'attendees':
                return 'Select Attendees'
            case 'games':
                return 'Select Games'
            case 'matrix':
                return 'Who Played What'
            default:
                return ''
        }
    }

    public getStepDescription(): string {
        switch (this.currentStep()) {
            case 'group':
                return 'Choose the group for this play session'
            case 'date':
                return 'When did this session take place?'
            case 'attendees':
                return 'Select who attended this session'
            case 'games':
                return 'Select which games were played'
            case 'matrix':
                return 'Mark who played which games'
            default:
                return ''
        }
    }

    public getSelectedAttendees(): AttendeeSelection[] {
        return this.attendees().filter(a => a.selected)
    }

    public getSelectedGames(): GameSelection[] {
        return this.games().filter(g => g.selected)
    }
} 
