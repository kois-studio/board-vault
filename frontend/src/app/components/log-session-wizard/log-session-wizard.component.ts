import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
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
import { IconComponent } from '../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { SpinnerComponent } from '../../components/ui/spinner/spinner.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { ImageProfileComponent } from '../image-profile/image-profile.component'
import { ToastService } from '../toast/toast.service'
import { ImageBackgroundComponent } from '../ui/image-background/image-background.component'

type SessionStep = 'who' | 'games' | 'save'

const STEP_ORDER: Array<SessionStep> = ['who', 'games', 'save']

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
}

/** Today in the browser's timezone, as the date input expects it (YYYY-MM-DD). */
function todayInputValue(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Records a game night that already happened, in three steps: who came and
 * when, what they played (and who played each game), and an optional note.
 */
@Component({
    selector: 'app-log-session-wizard',
    templateUrl: './log-session-wizard.component.html',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SpinnerComponent,
        PageHeaderComponent,
        ContainerWrapperComponent,
        IconComponent,
        ImageProfileComponent,
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
    public currentStep = signal<SessionStep>('who')
    public isLoading = signal<boolean>(false)

    public steps: StepInfo[] = [
        { key: 'who', label: 'Who and when', description: 'Pick the group, the day, and who came.' },
        {
            key: 'games',
            label: 'Games',
            description: 'Tick the games you played. Everyone who came is marked as a player; untick anyone who sat a game out.',
        },
        { key: 'save', label: 'Note and save', description: 'Add a note if you like, check the details, and save.' },
    ]

    // --------------------------------------------------------------------------
    //        STEP 1: WHO AND WHEN
    // --------------------------------------------------------------------------
    public selectedGroup = signal<GroupWithMembersAndGames | null>(null)
    public groupPeople = signal<Array<GroupPersonWorkspaceType>>([])
    public groupPersonCatalog = signal<Array<GameCompleteType>>([])
    public usesGroupPeople = signal(false)
    public readonly today = todayInputValue()

    public sessionDate = new FormControl(this.today, [
        Validators.required,
        (control) => (!control.value || control.value <= todayInputValue() ? null : { futureDate: true }),
    ])

    public attendees = signal<AttendeeSelection[]>([])

    // --------------------------------------------------------------------------
    //        STEP 2: GAMES AND PLAYERS
    // --------------------------------------------------------------------------
    public games = signal<GameSelection[]>([])
    public matrix = signal<MatrixCell[]>([])
    /** Player choices the person made, kept when an attendee or game is removed and added back. */
    private readonly playerChoices = new Map<string, boolean>()
    public gameQuery = signal('')
    /** The offered games matching the search; chosen games always stay visible. */
    public readonly visibleGames = computed(() => {
        const query = this.gameQuery().trim().toLowerCase()
        return this.games().filter(
            (selection) => selection.selected || !query || this.getGameTitle(selection.game).toLowerCase().includes(query),
        )
    })

    // --------------------------------------------------------------------------
    //        STEP 3: NOTE AND SAVE
    // --------------------------------------------------------------------------
    public sessionNotes = new FormControl('', [Validators.maxLength(1000)])

    // --------------------------------------------------------------------------
    //        STEP COMPLETION
    // --------------------------------------------------------------------------
    /** A step is complete once it is valid and the person has moved past it. */
    public isStepComplete = (step: SessionStep): boolean =>
        STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(this.currentStep()) && this.isStepValid(step)

    private isStepValid(step: SessionStep): boolean {
        switch (step) {
            case 'who':
                return (
                    this.selectedGroup() !== null &&
                    this.sessionDate.valid &&
                    this.sessionDate.value !== null &&
                    this.attendees().some((a) => a.selected)
                )
            case 'games':
                return this.hasParticipantsForEveryGame()
            case 'save':
                return this.isStepValid('who') && this.isStepValid('games') && this.sessionNotes.valid
        }
    }

    public getStepSummary = (step: SessionStep): string => {
        if (!this.isStepComplete(step)) return ''

        switch (step) {
            case 'who': {
                const people = this.getSelectedAttendees().length
                return `${this.selectedGroup()?.name} · ${people} ${people === 1 ? 'person' : 'people'}`
            }
            case 'games': {
                const games = this.getSelectedGames().length
                return `${games} ${games === 1 ? 'game' : 'games'}`
            }
            default:
                return ''
        }
    }

    constructor() {
        // With a single group there is nothing to choose.
        effect(() => {
            const groups = this.userGroups()
            if (groups.length === 1 && untracked(() => this.selectedGroup()) === null) this.selectGroup(groups[0])
        })

        effect(() => {
            const group = this.selectedGroup()
            if (!group) return

            // Only choosing a group resets the wizard. Signals read while initializing must not be
            // tracked, or a later change to them would clear the attendees.
            untracked(() => this.initializeForGroup(group))
        })

        // Offer the games the people who came own, keeping any game already ticked that is still offered.
        effect(() => {
            const selectedAttendees = this.attendees().filter((a) => a.selected)
            const chosenGameIds = new Set(
                untracked(() => this.games())
                    .filter((selection) => selection.selected)
                    .map((selection) => selection.game.id),
            )

            const availableGames = new Map<number, GameCompleteType>()
            for (const attendee of selectedAttendees) {
                for (const game of attendee.user.games) availableGames.set(game.id, game)
            }

            this.games.set(
                [...availableGames.values()]
                    .sort((a, b) => this.getGameTitle(a).localeCompare(this.getGameTitle(b)))
                    .map((game) => ({ game, selected: chosenGameIds.has(game.id) })),
            )
        })

        // One cell per attendee and chosen game. New cells start ticked; existing ones keep their value.
        effect(() => {
            const selectedAttendees = this.attendees().filter((a) => a.selected)
            const selectedGames = this.games().filter((g) => g.selected)
            const previous = new Map(untracked(() => this.matrix()).map((cell) => [`${cell.attendeeId}:${cell.gameId}`, cell.selected]))

            this.matrix.set(
                selectedAttendees.flatMap((attendee) =>
                    selectedGames.map((game) => ({
                        attendeeId: attendee.user.id,
                        gameId: game.game.id,
                        selected:
                            previous.get(`${attendee.user.id}:${game.game.id}`) ??
                            this.playerChoices.get(`${attendee.user.id}:${game.game.id}`) ??
                            true,
                    })),
                ),
            )
        })
    }

    private initializeForGroup(group: GroupWithMembersAndGames): void {
        this.attendees.set(group.members.map((member) => ({ user: member, selected: false })))
        this.games.set([])
        this.matrix.set([])
        this.playerChoices.clear()
        this.groupPersonCatalog.set([])
        this.groupPeople.set([])
        this.usesGroupPeople.set(false)
        this.loadGroupPeople(group)
    }

    private loadGroupPeople(group: GroupWithMembersAndGames): void {
        const loader = this.api.getGroupPeople
        if (typeof loader !== 'function') return

        // Ignore a slow response for a group that is no longer selected.
        const isCurrentGroup = () => this.selectedGroup()?.id === group.id

        loader.call(this.api, group.id).subscribe({
            next: (response) => {
                if (!isCurrentGroup()) return
                const activePeople = response.people.filter((person) => person.person.status === 'active')
                if (activePeople.length === 0) return

                const groupGames = new Map<number, GameCompleteType>()
                for (const member of group.members) {
                    for (const game of member.games) groupGames.set(game.id, game)
                }

                const applyPeople = (catalog: Array<GameCompleteType>) => {
                    if (!isCurrentGroup()) return
                    // Members ticked before the people list arrived stay selected as their linked person.
                    const selectedAccountIds = new Set(
                        this.usesGroupPeople()
                            ? []
                            : this.attendees()
                                  .filter((attendee) => attendee.selected)
                                  .map((attendee) => attendee.user.id),
                    )
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
                            // A linked person's avatar and username live on their account.
                            const member =
                                person.person.accountId === null
                                    ? undefined
                                    : group.members.find((candidate) => candidate.id === person.person.accountId)
                            return {
                                user: {
                                    id: person.person.id,
                                    username: member?.username ?? person.person.displayName.toLowerCase().replace(/\s+/g, '-'),
                                    displayName: person.person.displayName,
                                    avatar: person.person.avatar ??
                                        member?.avatar ?? {
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
                                selected: person.person.accountId !== null && selectedAccountIds.has(person.person.accountId),
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
                if (!isCurrentGroup()) return
                this.groupPeople.set([])
                this.usesGroupPeople.set(false)
            },
        })
    }

    // --------------------------------------------------------------------------
    //        STEP NAVIGATION
    // --------------------------------------------------------------------------
    public canProceedToNextStep(): boolean {
        return this.isStepValid(this.currentStep())
    }

    public nextStep(): void {
        if (!this.canProceedToNextStep()) return
        const step = this.currentStep()
        if (step === 'save') {
            void this.submitSession()
            return
        }
        this.currentStep.set(STEP_ORDER[STEP_ORDER.indexOf(step) + 1])
    }

    public previousStep(): void {
        const index = STEP_ORDER.indexOf(this.currentStep())
        if (index > 0) this.currentStep.set(STEP_ORDER[index - 1])
    }

    /** Steps already passed can be reopened from the progress bar. */
    public goToStep(step: SessionStep): void {
        if (STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(this.currentStep())) this.currentStep.set(step)
    }

    // --------------------------------------------------------------------------
    //        GROUP AND ATTENDEES
    // --------------------------------------------------------------------------
    public selectGroup(group: GroupWithMembersAndGames): void {
        this.selectedGroup.set(group)
    }

    public toggleAttendee(attendeeId: number): void {
        this.attendees.update((attendees) =>
            attendees.map((attendee) => (attendee.user.id === attendeeId ? { ...attendee, selected: !attendee.selected } : attendee)),
        )
    }

    public selectAllAttendees(): void {
        this.attendees.update((attendees) => attendees.map((attendee) => ({ ...attendee, selected: true })))
    }

    public deselectAllAttendees(): void {
        this.attendees.update((attendees) => attendees.map((attendee) => ({ ...attendee, selected: false })))
    }

    // --------------------------------------------------------------------------
    //        GAMES AND PLAYERS
    // --------------------------------------------------------------------------
    public toggleGame(gameId: number): void {
        this.games.update((games) => games.map((game) => (game.game.id === gameId ? { ...game, selected: !game.selected } : game)))
    }

    public toggleMatrixCell(attendeeId: number, gameId: number): void {
        this.matrix.update((matrix) =>
            matrix.map((cell) => {
                if (cell.attendeeId !== attendeeId || cell.gameId !== gameId) return cell
                this.playerChoices.set(`${attendeeId}:${gameId}`, !cell.selected)
                return { ...cell, selected: !cell.selected }
            }),
        )
    }

    public isMatrixCellSelected(attendeeId: number, gameId: number): boolean {
        return this.matrix().some((cell) => cell.attendeeId === attendeeId && cell.gameId === gameId && cell.selected)
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
            this.toastService.error('Choose a group, who came, and at least one game before saving.')
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
            // Play › History and Home read these cached lists; reload them so the new session shows up.
            this.dataService.refreshUserHistory()
            this.dataService.refreshUserMeets()
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
    public getStepInfo(): StepInfo {
        return this.steps.find((step) => step.key === this.currentStep()) ?? this.steps[0]
    }

    public getStepIndex(step: SessionStep): number {
        return STEP_ORDER.indexOf(step)
    }

    public getSelectedAttendees(): AttendeeSelection[] {
        return this.attendees().filter((a) => a.selected)
    }

    public getSelectedAttendeeNames(): string {
        return this.getSelectedAttendees()
            .map((attendee) => attendee.user.displayName || attendee.user.username)
            .join(', ')
    }

    public getPlayerNames(gameId: number): string {
        return this.getSelectedAttendees()
            .filter((attendee) => this.isMatrixCellSelected(attendee.user.id, gameId))
            .map((attendee) => attendee.user.displayName || attendee.user.username)
            .join(', ')
    }

    public getSelectedGames(): GameSelection[] {
        return this.games().filter((g) => g.selected)
    }

    public getGameTitle(game: GameCompleteType): string {
        return game.titleTranslations.en || game.title || 'Untitled game'
    }

    public getSessionDateLabel(): string {
        const value = this.sessionDate.value
        if (!value) return 'Not set'
        return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
            new Date(`${value}T12:00:00`),
        )
    }

    public retryGroups(): void {
        this.dataService.refreshUserGroups()
    }
}
