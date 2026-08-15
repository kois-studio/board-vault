import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import type { GameCompleteType, GameReviewDto, GroupWithMembersAndGames, PublicUserType } from '../../api/api.types'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { SpinnerComponent } from '../../components/ui/spinner/spinner.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { CardAccountComponent } from '../card-account/card-account.component'
import { ImageBackgroundComponent } from '../ui/image-background/image-background.component'

type SessionStep = 'group' | 'date' | 'attendees' | 'games' | 'matrix'

interface AttendeeSelection {
    user: PublicUserType & {
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

interface StepInfo {
    key: SessionStep
    label: string
    description: string
    summary?: string
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
        CardAccountComponent,
        ImageBackgroundComponent,
        ButtonComponent,
    ],
})
export class LogSessionWizardComponent {
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)
    private readonly router = inject(Router)

    public currentUser = this.dataService.currentUser
    public userGroups = this.dataService.userGroups

    // --------------------------------------------------------------------------
    //        LOADING STATES
    // --------------------------------------------------------------------------
    public isLoadingGroups = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS])

    // --------------------------------------------------------------------------
    //        WIZARD STATE
    // --------------------------------------------------------------------------
    public currentStep = signal<SessionStep>('group')
    public isLoading = signal<boolean>(false)

    // Track which steps the user has actually interacted with
    public completedSteps = signal<Set<SessionStep>>(new Set())

    // --------------------------------------------------------------------------
    //        STEPS MODEL
    // --------------------------------------------------------------------------
    public steps: StepInfo[] = [
        { key: 'group', label: 'Group', description: 'Choose the group for this play session' },
        { key: 'date', label: 'Date', description: 'When did this session take place?' },
        { key: 'attendees', label: 'Attendees', description: 'Select who attended this session' },
        { key: 'games', label: 'Games', description: 'Select which games were played' },
        { key: 'matrix', label: 'Matrix', description: 'Mark who played which games' },
    ]

    // --------------------------------------------------------------------------
    //        STEP 1: GROUP SELECTION
    // --------------------------------------------------------------------------
    public selectedGroup = signal<GroupWithMembersAndGames | null>(null)

    // --------------------------------------------------------------------------
    //        STEP 2: DATE SELECTION
    // --------------------------------------------------------------------------
    public sessionDate = new FormControl('', [
        Validators.required,
        control => {
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

    // --------------------------------------------------------------------------
    //        STEP COMPLETION TRACKING
    // --------------------------------------------------------------------------
    public isStepComplete = (step: SessionStep): boolean => {
        // Check if the step has valid data
        const hasValidData = (() => {
            switch (step) {
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
        })()

        // For steps with valid data, mark as complete if:
        // 1. User has explicitly interacted with the step, OR
        // 2. User has navigated past this step (meaning they've seen it and it was valid)
        if (hasValidData) {
            if (this.completedSteps().has(step)) {
                return true
            }

            // Check if user has navigated past this step
            const stepOrder = ['group', 'date', 'attendees', 'games', 'matrix']
            const currentStepIndex = stepOrder.indexOf(this.currentStep())
            const stepIndex = stepOrder.indexOf(step)

            return stepIndex < currentStepIndex
        }

        return false
    }

    public getStepSummary = (step: SessionStep): string => {
        // Only show summary if step is actually complete
        if (!this.isStepComplete(step)) {
            return ''
        }

        switch (step) {
            case 'group':
                const group = this.selectedGroup()
                return group ? group.name : ''
            case 'date':
                return this.sessionDate.value ? new Date(this.sessionDate.value).toLocaleDateString() : ''
            case 'attendees':
                const selectedAttendees = this.attendees().filter(a => a.selected)
                return selectedAttendees.length > 0 ? `${selectedAttendees.length} selected` : ''
            case 'games':
                const selectedGames = this.games().filter(g => g.selected)
                return selectedGames.length > 0 ? `${selectedGames.length} selected` : ''
            case 'matrix':
                const selectedCells = this.matrix().filter(cell => cell.selected)
                return selectedCells.length > 0 ? `${selectedCells.length} combinations` : ''
            default:
                return ''
        }
    }

    // Helper method to mark a step as interacted with
    private markStepAsInteracted(step: SessionStep): void {
        const currentCompleted = this.completedSteps()
        if (!currentCompleted.has(step)) {
            this.completedSteps.set(new Set([...currentCompleted, step]))
        }
    }

    constructor() {
        // Set today as default date
        const today = new Date().toISOString().split('T')[0]
        this.sessionDate.setValue(today)

        // Track date field interactions
        this.sessionDate.valueChanges.subscribe(() => {
            this.markStepAsInteracted('date')
        })

        effect(() => {
            const group = this.selectedGroup()
            if (group) {
                // Only auto-advance if we're currently on step 1
                if (this.currentStep() === 'group') {
                    this.currentStep.set('date')
                    this.markStepAsInteracted('group')
                }

                // Initialize attendees from group members
                this.attendees.set(
                    group.members.map(member => ({
                        user: member,
                        selected: false,
                    })),
                )

                // Initialize games from all group members' games (will be filtered later based on selected attendees)
                const allGames = new Map<number, GameCompleteType>()
                for (const member of group.members) {
                    for (const game of member.games) {
                        if (!allGames.has(game.id)) {
                            allGames.set(game.id, game)
                        }
                    }
                }

                this.games.set(
                    Array.from(allGames.values()).map(game => ({
                        game,
                        selected: false,
                    })),
                )
            }
        })

        effect(() => {
            const selectedAttendees = this.attendees().filter(a => a.selected)

            // Filter games based on selected attendees
            if (selectedAttendees.length > 0) {
                const availableGames = new Map<number, GameCompleteType>()
                for (const attendee of selectedAttendees) {
                    for (const game of attendee.user.games) {
                        if (!availableGames.has(game.id)) {
                            availableGames.set(game.id, game)
                        }
                    }
                }

                this.games.set(
                    Array.from(availableGames.values()).map(game => ({
                        game,
                        selected: false,
                    })),
                )
            } else {
                // If no attendees selected, clear games
                this.games.set([])
            }
        })

        effect(() => {
            const selectedAttendees = this.attendees().filter(a => a.selected)
            const selectedGames = this.games().filter(g => g.selected)

            // Rebuild matrix when selections change - set all cells to selected by default
            const newMatrix: MatrixCell[] = []
            for (const attendee of selectedAttendees) {
                for (const game of selectedGames) {
                    newMatrix.push({
                        attendeeId: attendee.user.id,
                        gameId: game.game.id,
                        selected: true, // Default to selected
                    })
                }
            }
            this.matrix.set(newMatrix)
        })
    }

    // --------------------------------------------------------------------------
    //        STEP NAVIGATION
    // --------------------------------------------------------------------------
    public canProceedToNextStep(): boolean {
        // Check if current step has valid data to proceed to next step
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
                // Mark group step as complete
                this.markStepAsInteracted('group')
                // Mark date step as complete if it has valid data
                if (this.sessionDate.valid && this.sessionDate.value) {
                    this.markStepAsInteracted('date')
                }
                break
            case 'date':
                this.currentStep.set('attendees')
                // Mark date step as complete
                this.markStepAsInteracted('date')
                break
            case 'attendees':
                this.currentStep.set('games')
                // Mark attendees step as complete
                this.markStepAsInteracted('attendees')
                break
            case 'games':
                this.currentStep.set('matrix')
                // Mark games step as complete
                this.markStepAsInteracted('games')
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
        this.markStepAsInteracted('group')
    }

    // --------------------------------------------------------------------------
    //        ATTENDEE SELECTION
    // --------------------------------------------------------------------------
    public toggleAttendee(attendeeId: number): void {
        const updatedAttendees = this.attendees().map(attendee =>
            attendee.user.id === attendeeId ? { ...attendee, selected: !attendee.selected } : attendee,
        )
        this.attendees.set(updatedAttendees)
        this.markStepAsInteracted('attendees')
    }

    public selectAllAttendees(): void {
        const updatedAttendees = this.attendees().map(attendee => ({
            ...attendee,
            selected: true,
        }))
        this.attendees.set(updatedAttendees)
        this.markStepAsInteracted('attendees')
    }

    public deselectAllAttendees(): void {
        const updatedAttendees = this.attendees().map(attendee => ({
            ...attendee,
            selected: false,
        }))
        this.attendees.set(updatedAttendees)
        this.markStepAsInteracted('attendees')
    }

    // --------------------------------------------------------------------------
    //        GAME SELECTION
    // --------------------------------------------------------------------------
    public toggleGame(gameId: number): void {
        const updatedGames = this.games().map(game => (game.game.id === gameId ? { ...game, selected: !game.selected } : game))
        this.games.set(updatedGames)
        this.markStepAsInteracted('games')
    }

    public selectAllGames(): void {
        const updatedGames = this.games().map(game => ({
            ...game,
            selected: true,
        }))
        this.games.set(updatedGames)
        this.markStepAsInteracted('games')
    }

    public deselectAllGames(): void {
        const updatedGames = this.games().map(game => ({
            ...game,
            selected: false,
        }))
        this.games.set(updatedGames)
        this.markStepAsInteracted('games')
    }

    // --------------------------------------------------------------------------
    //        MATRIX OPERATIONS
    // --------------------------------------------------------------------------
    public toggleMatrixCell(attendeeId: number, gameId: number): void {
        const updatedMatrix = this.matrix().map(cell =>
            cell.attendeeId === attendeeId && cell.gameId === gameId ? { ...cell, selected: !cell.selected } : cell,
        )
        this.matrix.set(updatedMatrix)
        this.markStepAsInteracted('matrix')
    }

    public toggleAllForAttendee(attendeeId: number): void {
        const attendeeCells = this.matrix().filter(cell => cell.attendeeId === attendeeId)
        const allSelected = attendeeCells.every(cell => cell.selected)

        const updatedMatrix = this.matrix().map(cell => (cell.attendeeId === attendeeId ? { ...cell, selected: !allSelected } : cell))
        this.matrix.set(updatedMatrix)
        this.markStepAsInteracted('matrix')
    }

    public toggleAllForGame(gameId: number): void {
        const gameCells = this.matrix().filter(cell => cell.gameId === gameId)
        const allSelected = gameCells.every(cell => cell.selected)

        const updatedMatrix = this.matrix().map(cell => (cell.gameId === gameId ? { ...cell, selected: !allSelected } : cell))
        this.matrix.set(updatedMatrix)
        this.markStepAsInteracted('matrix')
    }

    public selectAllForAttendee(attendeeId: number): void {
        const updatedMatrix = this.matrix().map(cell => (cell.attendeeId === attendeeId ? { ...cell, selected: true } : cell))
        this.matrix.set(updatedMatrix)
        this.markStepAsInteracted('matrix')
    }

    public selectAllForGame(gameId: number): void {
        const updatedMatrix = this.matrix().map(cell => (cell.gameId === gameId ? { ...cell, selected: true } : cell))
        this.matrix.set(updatedMatrix)
        this.markStepAsInteracted('matrix')
    }

    public isMatrixCellSelected(attendeeId: number, gameId: number): boolean {
        return this.matrix().some(cell => cell.attendeeId === attendeeId && cell.gameId === gameId && cell.selected)
    }

    public isAllSelectedForAttendee(attendeeId: number): boolean {
        const attendeeCells = this.matrix().filter(cell => cell.attendeeId === attendeeId)
        return attendeeCells.length > 0 && attendeeCells.every(cell => cell.selected)
    }

    public isAllSelectedForGame(gameId: number): boolean {
        const gameCells = this.matrix().filter(cell => cell.gameId === gameId)
        return gameCells.length > 0 && gameCells.every(cell => cell.selected)
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
        const currentStepInfo = this.steps.find(s => s.key === this.currentStep())
        return currentStepInfo?.label || ''
    }

    public getStepDescription(): string {
        const currentStepInfo = this.steps.find(s => s.key === this.currentStep())
        return currentStepInfo?.description || ''
    }

    public getSelectedAttendees(): AttendeeSelection[] {
        return this.attendees().filter(a => a.selected)
    }

    public getSelectedGames(): GameSelection[] {
        return this.games().filter(g => g.selected)
    }
}
