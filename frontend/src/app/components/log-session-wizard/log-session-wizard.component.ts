import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type {
    GameCompleteType,
    GameReviewDto,
    GroupPersonWorkspaceType,
    GroupWithMembersAndGames,
    PublicUserType,
} from '../../api/api.types'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { SpinnerComponent } from '../../components/ui/spinner/spinner.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { CardAccountComponent } from '../card-account/card-account.component'
import { ToastService } from '../toast/toast.service'
import { ImageBackgroundComponent } from '../ui/image-background/image-background.component'

type SessionStep = 'group' | 'date' | 'attendees' | 'games' | 'matrix' | 'notes'

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
        RouterLink,
    ],
})
export class LogSessionWizardComponent {
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)
    private readonly router = inject(Router)
    private readonly api = inject(Api)
    private readonly toastService = inject(ToastService)

    public currentUser = this.dataService.currentUser
    public userGroups = this.dataService.userGroups
    public userGroupsError = this.dataService.userGroupsError

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
        { key: 'matrix', label: 'Who played what?', description: 'Tell the group who played each game' },
        { key: 'notes', label: 'Notes', description: 'Add a note about this session (optional)' },
    ]

    // --------------------------------------------------------------------------
    //        STEP 1: GROUP SELECTION
    // --------------------------------------------------------------------------
    public selectedGroup = signal<GroupWithMembersAndGames | null>(null)
    public groupPeople = signal<Array<GroupPersonWorkspaceType>>([])
    public groupPersonCatalog = signal<Array<GameCompleteType>>([])
    public usesGroupPeople = signal(false)
    private peopleLoadedForGroupId: number | null = null

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

    // --------------------------------------------------------------------------
    //        STEP 6: SESSION MEMORY
    // --------------------------------------------------------------------------
    public sessionNotes = new FormControl('', [Validators.maxLength(1000)])

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
                    return this.attendees().some((a) => a.selected)
                case 'games':
                    return this.games().some((g) => g.selected)
                case 'matrix':
                    return this.hasParticipantsForEveryGame()
                case 'notes':
                    return true
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
            const stepOrder = ['group', 'date', 'attendees', 'games', 'matrix', 'notes']
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
            case 'group': {
                const group = this.selectedGroup()
                return group ? group.name : ''
            }
            case 'date':
                return this.sessionDate.value ? new Date(this.sessionDate.value).toLocaleDateString() : ''
            case 'attendees': {
                const selectedAttendees = this.attendees().filter((a) => a.selected)
                return selectedAttendees.length > 0 ? `${selectedAttendees.length} selected` : ''
            }
            case 'games': {
                const selectedGames = this.games().filter((g) => g.selected)
                return selectedGames.length > 0 ? `${selectedGames.length} selected` : ''
            }
            case 'matrix': {
                const selectedGames = this.getSelectedGames()
                const selectedParticipants = selectedGames.reduce(
                    (total, game) => total + this.getSelectedParticipantCount(game.game.id),
                    0,
                )
                return selectedGames.length > 0 ? `${selectedParticipants} player choices` : ''
            }
            case 'notes':
                return this.sessionNotes.value?.trim() ? 'Added' : 'Optional'
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
                    group.members.map((member) => ({
                        user: member,
                        selected: false,
                    })),
                )
                this.groupPersonCatalog.set([])
                this.loadGroupPeople(group)

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
                    Array.from(allGames.values()).map((game) => ({
                        game,
                        selected: false,
                    })),
                )
            }
        })

        effect(() => {
            const selectedAttendees = this.attendees().filter((a) => a.selected)

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
                    Array.from(availableGames.values()).map((game) => ({
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
            const selectedAttendees = this.attendees().filter((a) => a.selected)
            const selectedGames = this.games().filter((g) => g.selected)

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

    private loadGroupPeople(group: GroupWithMembersAndGames): void {
        if (this.peopleLoadedForGroupId === group.id) return
        this.peopleLoadedForGroupId = group.id

        const loader = this.api.getGroupPeople
        if (typeof loader !== 'function') return

        loader.call(this.api, group.id).subscribe({
            next: (response) => {
                const activePeople = response.people.filter((person) => person.person.status === 'active')
                if (activePeople.length === 0) return

                const groupGames = new Map<number, GameCompleteType>()
                for (const member of group.members) {
                    for (const game of member.games) groupGames.set(game.id, game)
                }

                const applyPeople = (catalog: Array<GameCompleteType>) => {
                    for (const game of catalog) groupGames.set(game.id, game)
                    this.groupPersonCatalog.set(catalog)
                    this.groupPeople.set(activePeople)
                    this.usesGroupPeople.set(true)
                    this.attendees.set(
                        activePeople.map((person) => {
                            const ownedGameIds = new Set(
                                person.ownership
                                    .filter((ownership) => ownership.status === 'asserted')
                                    .map((ownership) => ownership.gameId),
                            )
                            const games = [...groupGames.values()].filter((game) => ownedGameIds.has(game.id))
                            return {
                                user: {
                                    id: person.person.id,
                                    username: person.person.displayName.toLowerCase().replace(/\s+/g, '-'),
                                    displayName: person.person.displayName,
                                    avatar: person.person.avatar ?? {
                                        backgroundColor: '#64748b',
                                        iconName: null,
                                        emoji: null,
                                        type: 'initials' as const,
                                        initials: person.person.displayName.slice(0, 2).toUpperCase(),
                                    },
                                    joinedAt: person.person.createdAt,
                                    games,
                                    reviews: [],
                                },
                                selected: false,
                            }
                        }),
                    )
                }

                if (typeof this.api.getGroupPersonCatalog === 'function') {
                    this.api.getGroupPersonCatalog(group.id).subscribe({
                        next: (catalog) => applyPeople(catalog),
                        error: () => applyPeople([]),
                    })
                } else {
                    applyPeople([])
                }
            },
            error: () => {
                this.groupPeople.set([])
                this.usesGroupPeople.set(false)
            },
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
                return this.attendees().some((a) => a.selected)
            case 'games':
                return this.games().some((g) => g.selected)
            case 'matrix':
                return this.hasParticipantsForEveryGame()
            case 'notes':
                return true
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
                this.currentStep.set('notes')
                this.markStepAsInteracted('matrix')
                break
            case 'notes':
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
            case 'notes':
                this.currentStep.set('matrix')
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
        const updatedAttendees = this.attendees().map((attendee) =>
            attendee.user.id === attendeeId ? { ...attendee, selected: !attendee.selected } : attendee,
        )
        this.attendees.set(updatedAttendees)
        this.markStepAsInteracted('attendees')
    }

    public selectAllAttendees(): void {
        const updatedAttendees = this.attendees().map((attendee) => ({
            ...attendee,
            selected: true,
        }))
        this.attendees.set(updatedAttendees)
        this.markStepAsInteracted('attendees')
    }

    public deselectAllAttendees(): void {
        const updatedAttendees = this.attendees().map((attendee) => ({
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
        const updatedGames = this.games().map((game) => (game.game.id === gameId ? { ...game, selected: !game.selected } : game))
        this.games.set(updatedGames)
        this.markStepAsInteracted('games')
    }

    public selectAllGames(): void {
        const updatedGames = this.games().map((game) => ({
            ...game,
            selected: true,
        }))
        this.games.set(updatedGames)
        this.markStepAsInteracted('games')
    }

    public deselectAllGames(): void {
        const updatedGames = this.games().map((game) => ({
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
        const updatedMatrix = this.matrix().map((cell) =>
            cell.attendeeId === attendeeId && cell.gameId === gameId ? { ...cell, selected: !cell.selected } : cell,
        )
        this.matrix.set(updatedMatrix)
        this.markStepAsInteracted('matrix')
    }

    public toggleAllForAttendee(attendeeId: number): void {
        const attendeeCells = this.matrix().filter((cell) => cell.attendeeId === attendeeId)
        const allSelected = attendeeCells.every((cell) => cell.selected)

        const updatedMatrix = this.matrix().map((cell) => (cell.attendeeId === attendeeId ? { ...cell, selected: !allSelected } : cell))
        this.matrix.set(updatedMatrix)
        this.markStepAsInteracted('matrix')
    }

    public toggleAllForGame(gameId: number): void {
        const gameCells = this.matrix().filter((cell) => cell.gameId === gameId)
        const allSelected = gameCells.every((cell) => cell.selected)

        const updatedMatrix = this.matrix().map((cell) => (cell.gameId === gameId ? { ...cell, selected: !allSelected } : cell))
        this.matrix.set(updatedMatrix)
        this.markStepAsInteracted('matrix')
    }

    public selectAllForAttendee(attendeeId: number): void {
        const updatedMatrix = this.matrix().map((cell) => (cell.attendeeId === attendeeId ? { ...cell, selected: true } : cell))
        this.matrix.set(updatedMatrix)
        this.markStepAsInteracted('matrix')
    }

    public selectAllForGame(gameId: number): void {
        const updatedMatrix = this.matrix().map((cell) => (cell.gameId === gameId ? { ...cell, selected: true } : cell))
        this.matrix.set(updatedMatrix)
        this.markStepAsInteracted('matrix')
    }

    public isMatrixCellSelected(attendeeId: number, gameId: number): boolean {
        return this.matrix().some((cell) => cell.attendeeId === attendeeId && cell.gameId === gameId && cell.selected)
    }

    public isAllSelectedForAttendee(attendeeId: number): boolean {
        const attendeeCells = this.matrix().filter((cell) => cell.attendeeId === attendeeId)
        return attendeeCells.length > 0 && attendeeCells.every((cell) => cell.selected)
    }

    public isAllSelectedForGame(gameId: number): boolean {
        const gameCells = this.matrix().filter((cell) => cell.gameId === gameId)
        return gameCells.length > 0 && gameCells.every((cell) => cell.selected)
    }

    public getSelectedParticipantCount(gameId: number): number {
        return this.matrix().filter((cell) => cell.gameId === gameId && cell.selected).length
    }

    public hasParticipantsForEveryGame(): boolean {
        const selectedGames = this.getSelectedGames()

        return selectedGames.length > 0 && selectedGames.every((game) => this.getSelectedParticipantCount(game.game.id) > 0)
    }

    // --------------------------------------------------------------------------
    //        SUBMISSION
    // --------------------------------------------------------------------------
    private async submitSession(): Promise<void> {
        const group = this.selectedGroup()
        const sessionDate = this.sessionDate.value
        const selectedAttendees = this.attendees().filter((attendee) => attendee.selected)
        const selectedGames = this.games().filter((game) => game.selected)

        if (!group || !sessionDate || selectedAttendees.length === 0 || selectedGames.length === 0) {
            this.toastService.error('Select a group, attendees, and at least one game before saving the session.')
            return
        }

        const games = selectedGames.map(({ game }) => ({
            gameId: game.id,
            participantIds: this.matrix()
                .filter((cell) => cell.gameId === game.id && cell.selected)
                .map((cell) => cell.attendeeId),
        }))

        if (games.some((game) => game.participantIds.length === 0)) {
            this.toastService.error('Select at least one player for every game.')
            return
        }

        this.isLoading.set(true)

        try {
            const result = await firstValueFrom(
                this.api.createPlaySession({
                    groupId: group.id,
                    sessionDate: new Date(`${sessionDate}T12:00:00`).toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    notes: this.sessionNotes.value?.trim() || undefined,
                    ...(this.usesGroupPeople()
                        ? {
                              groupPersonIds: selectedAttendees.map((attendee) => attendee.user.id),
                              games: games.map((game) => ({ gameId: game.gameId, participantPersonIds: game.participantIds })),
                          }
                        : {
                              attendeeIds: selectedAttendees.map((attendee) => attendee.user.id),
                              games,
                          }),
                }),
            )

            this.toastService.success('Session saved.')
            await this.router.navigate(['/sessions', result.sessionId])
        } catch {
            this.toastService.error('Could not save the session. Please review your selections and try again.')
        } finally {
            this.isLoading.set(false)
        }
    }

    // --------------------------------------------------------------------------
    //        UTILITY METHODS
    // --------------------------------------------------------------------------
    public getStepTitle(): string {
        const currentStepInfo = this.steps.find((s) => s.key === this.currentStep())
        return currentStepInfo?.label || ''
    }

    public getStepDescription(): string {
        const currentStepInfo = this.steps.find((s) => s.key === this.currentStep())
        return currentStepInfo?.description || ''
    }

    public getSelectedAttendees(): AttendeeSelection[] {
        return this.attendees().filter((a) => a.selected)
    }

    public getSelectedGames(): GameSelection[] {
        return this.games().filter((g) => g.selected)
    }

    public retryGroups(): void {
        this.dataService.refreshUserGroups()
    }
}
