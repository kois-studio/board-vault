import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type {
    CreatePlaySessionRequest,
    GameCompleteType,
    GameReviewDto,
    GroupPersonWorkspaceType,
    GroupWithMembersAndGames,
    PublicUserType,
    SessionRecording,
} from '../../api/api.types'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { SpinnerComponent } from '../../components/ui/spinner/spinner.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { CountPipe, PlayersPipe } from '../../core/pipes/count.pipe'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { canTakePart } from '../../core/utils/groupPeople'
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

type PlayChoice = {
    key: number
    gameId: number
    participantIds: number[]
    results: Record<number, { isWinner: boolean; score: number | null }>
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
        CountPipe,
        PlayersPipe,
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
    private readonly route = inject(ActivatedRoute)
    readonly editingId = Number(this.route.snapshot.queryParamMap.get('sessionId')) || null
    readonly isLive = this.route.snapshot.queryParamMap.get('mode') === 'live' && !this.editingId
    readonly requestedGroupId = Number(this.route.snapshot.queryParamMap.get('groupId')) || null
    readonly recordingError = signal('')
    readonly loadingRecording = signal(Boolean(this.editingId))
    readonly catalogLoading = signal(false)
    readonly catalogError = signal(false)
    readonly extras = signal<GameCompleteType[]>([])
    readonly additionalPlays = signal<PlayChoice[]>([])
    readonly primaryResults = signal<Record<number, PlayChoice['results']>>({})
    private pendingRecording: SessionRecording | null = null
    private revision = 0
    private nextPlayKey = 1
    private recordingRestored = false
    private groupLoadVersion = 0
    readonly sameDaySessions = computed(() => {
        const date = this.dateChoice()
        const group = this.selectedGroup()
        return (this.dataService.userMeets?.() ?? []).filter(
            (session) =>
                session.id !== this.editingId &&
                session.groupId === group?.id &&
                new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: session.timezone }).format(
                    new Date(session.meetDate),
                ) === date,
        )
    })
    readonly dateChoice = signal(todayInputValue())

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

    public steps: [StepInfo, ...StepInfo[]] = [
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
        const normalize = (value: string) =>
            value
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^\p{L}\p{N}]+/gu, ' ')
                .trim()
        const query = normalize(this.gameQuery())
        return this.games().filter(
            (selection) =>
                selection.selected ||
                !query ||
                [this.getGameTitle(selection.game), ...Object.values(selection.game.titleTranslations)].some((title) =>
                    normalize(title).includes(query),
                ),
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
        this.sessionDate.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => this.dateChoice.set(value ?? ''))
        if (this.editingId) void this.loadRecording()
        // With a single group there is nothing to choose.
        effect(() => {
            const groups = this.userGroups()
            const [onlyGroup] = groups
            const requested = groups.find((group) => group.id === (this.pendingRecording?.groupId ?? this.requestedGroupId))
            if (requested && untracked(() => this.selectedGroup()) === null) {
                this.selectGroup(requested)
                return
            }
            if (groups.length === 1 && onlyGroup && untracked(() => this.selectedGroup()) === null) this.selectGroup(onlyGroup)
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
            for (const game of this.extras()) availableGames.set(game.id, game)
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
        this.groupLoadVersion++
        this.attendees.set(group.members.map((member) => ({ user: member, selected: false })))
        for (const id of this.pendingRecording?.attendeeIds ?? []) {
            if (this.attendees().some((attendee) => attendee.user.id === id)) continue
            this.attendees.update((attendees) => [
                ...attendees,
                {
                    user: {
                        id,
                        username: 'Former player',
                        displayName: 'Former player',
                        avatar: { backgroundColor: '#64748b', iconName: null, emoji: null, type: 'initials', initials: 'FP' },
                        joinedAt: '',
                        games: [],
                        reviews: [],
                    },
                    selected: false,
                },
            ])
        }
        this.games.set([])
        this.matrix.set([])
        this.playerChoices.clear()
        this.groupPersonCatalog.set([])
        this.groupPeople.set([])
        this.usesGroupPeople.set(false)
        this.additionalPlays.set([])
        this.primaryResults.set({})
        if (!this.pendingRecording) this.extras.set([])
        this.loadGroupPeople(group)
        this.restoreRecording()
    }

    private loadGroupPeople(group: GroupWithMembersAndGames): void {
        const loader = this.api.getGroupPeople
        if (typeof loader !== 'function') return

        // Ignore a slow response for a group that is no longer selected.
        const version = this.groupLoadVersion
        const isCurrentGroup = () => this.selectedGroup()?.id === group.id && this.groupLoadVersion === version

        loader.call(this.api, group.id, Boolean(this.editingId)).subscribe({
            next: (response) => {
                if (!isCurrentGroup()) return
                const activePeople = response.people.filter(
                    (person) => canTakePart(person) || this.pendingRecording?.groupPersonIds?.includes(person.person.id),
                )
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
                    const legacyAccountIds = new Set(this.pendingRecording?.attendeeIds ?? [])
                    this.attendees.set(
                        activePeople
                            .filter((person) => person.person.accountId === null || !legacyAccountIds.has(person.person.accountId))
                            .map((person) => {
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
                    if (this.pendingRecording) {
                        const legacy = [...legacyAccountIds].map((accountId) => {
                            const member = group.members.find((member) => member.id === accountId)
                            const person = response.people.find((person) => person.person.accountId === accountId)?.person
                            const name = member?.displayName || person?.displayName || 'Former player'
                            return {
                                user: {
                                    id: -accountId,
                                    username: member?.username ?? name,
                                    displayName: name,
                                    avatar: member?.avatar ??
                                        person?.avatar ?? {
                                            backgroundColor: '#64748b',
                                            iconName: null,
                                            emoji: null,
                                            type: 'initials' as const,
                                            initials: name.slice(0, 2).toUpperCase(),
                                        },
                                    joinedAt: member?.joinedAt ?? '',
                                    games: member?.games ?? [],
                                    reviews: member?.reviews ?? [],
                                },
                                selected: false,
                            }
                        })
                        this.attendees.update((attendees) => [...attendees, ...legacy])
                        this.recordingRestored = false
                    }
                    this.restoreRecording()
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
        return !this.loadingRecording() && (!this.editingId || this.recordingRestored) && this.isStepValid(this.currentStep())
    }

    public nextStep(): void {
        if (!this.canProceedToNextStep()) return
        if (this.isLive) {
            void this.submitLive()
            return
        }
        const step = this.currentStep()
        if (step === 'save') {
            void this.submitSession()
            return
        }
        const next = STEP_ORDER[STEP_ORDER.indexOf(step) + 1]
        if (next) this.currentStep.set(next)
    }

    public previousStep(): void {
        const index = STEP_ORDER.indexOf(this.currentStep())
        const previous = STEP_ORDER[index - 1]
        if (index > 0 && previous) this.currentStep.set(previous)
    }

    /** Steps already passed can be reopened from the progress bar. */
    public goToStep(step: SessionStep): void {
        if (STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(this.currentStep())) this.currentStep.set(step)
    }

    // --------------------------------------------------------------------------
    //        GROUP AND ATTENDEES
    // --------------------------------------------------------------------------
    public selectGroup(group: GroupWithMembersAndGames): void {
        if (this.editingId && this.pendingRecording && group.id !== this.pendingRecording.groupId) return
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

        return (
            selectedGames.length > 0 &&
            this.recordedPlays().every(
                (play) =>
                    (play.participantIds?.length ?? 0) + (play.participantPersonIds?.length ?? 0) > 0 &&
                    (play.results ?? []).every(
                        (result) =>
                            result.score === null ||
                            result.score === undefined ||
                            (Number.isInteger(result.score) && Math.abs(result.score) <= 1000000),
                    ),
            )
        )
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
            const body: CreatePlaySessionRequest = {
                groupId: group.id,
                sessionDate:
                    this.editingId &&
                    this.pendingRecording &&
                    new Intl.DateTimeFormat('en-CA', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        timeZone: this.pendingRecording.timezone,
                    }).format(new Date(this.pendingRecording.sessionDate)) === sessionDate
                        ? this.pendingRecording.sessionDate
                        : new Date(`${sessionDate}T12:00:00`).toISOString(),
                timezone: this.pendingRecording?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                notes: this.sessionNotes.value?.trim() || undefined,
                ...(selectedAttendees.some((attendee) => !this.usesGroupPeople() || attendee.user.id < 0)
                    ? {
                          attendeeIds: selectedAttendees
                              .filter((attendee) => !this.usesGroupPeople() || attendee.user.id < 0)
                              .map((attendee) => Math.abs(attendee.user.id)),
                      }
                    : {}),
                ...(this.usesGroupPeople() && selectedAttendees.some((attendee) => attendee.user.id > 0)
                    ? { groupPersonIds: selectedAttendees.filter((attendee) => attendee.user.id > 0).map((attendee) => attendee.user.id) }
                    : {}),
                games: this.recordedPlays(),
            }
            let sessionId: number
            if (this.editingId) {
                await firstValueFrom(this.api.correctSession(this.editingId, { ...body, revision: this.revision }))
                sessionId = this.editingId
            } else sessionId = (await firstValueFrom(this.api.createPlaySession(body))).sessionId

            this.toastService.success('Session saved.')
            // Play › History and Home read these cached lists; reload them so the new session shows up.
            this.dataService.refreshUserHistory()
            this.dataService.refreshUserMeets()
            await this.router.navigate(['/sessions', sessionId], { queryParams: { saved: 1 } })
        } catch (error) {
            const status = (error as { status?: number }).status
            this.recordingError.set(
                status === 409
                    ? 'This session changed while you were editing. Your changes have not been saved. Reload the recording before trying again.'
                    : 'Could not save the session. Your choices are still here; check your connection and try again.',
            )
            this.toastService.error(this.recordingError())
        } finally {
            this.isLoading.set(false)
        }
    }

    public setDay(offset: number): void {
        const date = new Date()
        date.setDate(date.getDate() + offset)
        this.sessionDate.setValue(
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        )
    }

    public async searchCatalog(): Promise<void> {
        const group = this.selectedGroup()
        if (!group) return
        const query = this.gameQuery()
        this.catalogLoading.set(true)
        this.catalogError.set(false)
        try {
            const games = await firstValueFrom(this.api.getGroupPersonCatalog(group.id, query))
            if (this.selectedGroup()?.id === group.id && this.gameQuery() === query)
                this.extras.update((previous) => [...new Map([...previous, ...games].map((game) => [game.id, game])).values()])
        } catch {
            this.catalogError.set(true)
        } finally {
            this.catalogLoading.set(false)
        }
    }

    public repeatGame(gameId: number): void {
        if (this.recordedPlays().length >= 100) return
        this.additionalPlays.update((plays) => [
            ...plays,
            {
                key: this.nextPlayKey++,
                gameId,
                participantIds: this.getSelectedAttendees().map((attendee) => attendee.user.id),
                results: {},
            },
        ])
    }
    public removePlay(key: number): void {
        this.additionalPlays.update((plays) => plays.filter((play) => play.key !== key))
    }
    public playsFor(gameId: number): PlayChoice[] {
        return this.additionalPlays().filter((play) => play.gameId === gameId)
    }
    public togglePlayPerson(key: number, personId: number): void {
        this.additionalPlays.update((plays) =>
            plays.map((play) =>
                play.key === key
                    ? {
                          ...play,
                          participantIds: play.participantIds.includes(personId)
                              ? play.participantIds.filter((id) => id !== personId)
                              : [...play.participantIds, personId],
                      }
                    : play,
            ),
        )
    }
    public resultFor(gameId: number, personId: number, key?: number) {
        return (
            (key === undefined ? this.primaryResults()[gameId] : this.additionalPlays().find((play) => play.key === key)?.results)?.[
                personId
            ] ?? { isWinner: false, score: null }
        )
    }
    public setResult(gameId: number, personId: number, field: 'isWinner' | 'score', value: boolean | string, key?: number): void {
        const result = {
            ...this.resultFor(gameId, personId, key),
            [field]: field === 'score' ? (value === '' ? null : Number(value)) : value,
        }
        if (key === undefined)
            this.primaryResults.update((results) => ({ ...results, [gameId]: { ...results[gameId], [personId]: result } }))
        else
            this.additionalPlays.update((plays) =>
                plays.map((play) => (play.key === key ? { ...play, results: { ...play.results, [personId]: result } } : play)),
            )
    }
    public recordedPlays(): CreatePlaySessionRequest['games'] {
        const selectedPeople = new Set(this.getSelectedAttendees().map((attendee) => attendee.user.id))
        return this.getSelectedGames().flatMap(({ game }) => {
            const first: PlayChoice = {
                key: 0,
                gameId: game.id,
                participantIds: this.matrix()
                    .filter((cell) => cell.gameId === game.id && cell.selected)
                    .map((cell) => cell.attendeeId),
                results: this.primaryResults()[game.id] ?? {},
            }
            return [first, ...this.playsFor(game.id)].map((play) => {
                const people = play.participantIds.filter((id) => selectedPeople.has(id))
                const results = people.flatMap((id) => {
                    const result = play.results[id]
                    return result && (result.isWinner || result.score !== null)
                        ? [{ ...(this.usesGroupPeople() && id > 0 ? { groupPersonId: id } : { accountId: Math.abs(id) }), ...result }]
                        : []
                })
                return {
                    gameId: game.id,
                    ...(people.some((id) => !this.usesGroupPeople() || id < 0)
                        ? { participantIds: people.filter((id) => !this.usesGroupPeople() || id < 0).map((id) => Math.abs(id)) }
                        : {}),
                    ...(this.usesGroupPeople() && people.some((id) => id > 0)
                        ? { participantPersonIds: people.filter((id) => id > 0) }
                        : {}),
                    ...(results.length ? { results } : {}),
                }
            })
        })
    }

    public async loadRecording(): Promise<void> {
        if (!this.editingId) return
        this.loadingRecording.set(true)
        this.recordingError.set('')
        try {
            const recording = await firstValueFrom(this.api.getSessionRecording(this.editingId))
            const user = this.currentUser()
            if (!user) throw new Error('Sign in again')
            const games = await Promise.all(
                [...new Set(recording.games.map((play) => play.gameId))].map((id) => firstValueFrom(this.api.getGameView(user.id, id))),
            )
            this.pendingRecording = recording
            this.recordingRestored = false
            this.extras.set(games.map((game) => game.gameData))
            this.revision = recording.revision
            this.sessionDate.setValue(
                new Intl.DateTimeFormat('en-CA', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    timeZone: recording.timezone,
                }).format(new Date(recording.sessionDate)),
            )
            this.sessionNotes.setValue(recording.notes ?? '')
            const group = this.userGroups().find((group) => group.id === recording.groupId)
            if (group) {
                this.selectedGroup.set(null)
                this.selectGroup(group)
            }
        } catch {
            this.recordingError.set('Could not load this recording. Check your access and connection, then retry.')
        } finally {
            this.loadingRecording.set(false)
        }
    }

    private restoreRecording(): void {
        const recording = this.pendingRecording
        if (!recording || this.recordingRestored || this.selectedGroup()?.id !== recording.groupId) return
        if (recording.groupPersonIds?.length && !this.usesGroupPeople()) return
        this.recordingRestored = true
        const ids = this.usesGroupPeople()
            ? [...(recording.groupPersonIds ?? []), ...(recording.attendeeIds ?? []).map((id) => -id)]
            : (recording.attendeeIds ?? [])
        this.attendees.update((people) => people.map((person) => ({ ...person, selected: ids.includes(person.user.id) })))
        const games = new Map(this.extras().map((game) => [game.id, game]))
        this.games.set([...games.values()].map((game) => ({ game, selected: recording.games.some((play) => play.gameId === game.id) })))
        const primary = new Set<number>()
        const results: Record<number, PlayChoice['results']> = {}
        const extra: PlayChoice[] = []
        const matrix: MatrixCell[] = []
        for (const play of recording.games) {
            const participantIds = this.usesGroupPeople()
                ? [...(play.participantPersonIds ?? []), ...(play.participantIds ?? []).map((id) => -id)]
                : (play.participantIds ?? [])
            const playResults = Object.fromEntries(
                (play.results ?? []).map((result) => [
                    result.groupPersonId ?? (this.usesGroupPeople() ? -(result.accountId as number) : result.accountId),
                    { isWinner: result.isWinner, score: result.score ?? null },
                ]),
            )
            if (primary.has(play.gameId)) extra.push({ key: this.nextPlayKey++, gameId: play.gameId, participantIds, results: playResults })
            else {
                primary.add(play.gameId)
                results[play.gameId] = playResults
                for (const id of ids) {
                    matrix.push({ gameId: play.gameId, attendeeId: id, selected: participantIds.includes(id) })
                    this.playerChoices.set(`${id}:${play.gameId}`, participantIds.includes(id))
                }
            }
        }
        this.matrix.set(matrix)
        this.primaryResults.set(results)
        this.additionalPlays.set(extra)
    }

    private async submitLive(): Promise<void> {
        const group = this.selectedGroup()
        if (!group) return
        this.isLoading.set(true)
        try {
            const ids = this.getSelectedAttendees().map((attendee) => attendee.user.id)
            const session = await firstValueFrom(
                this.api.startLiveSession({
                    groupId: group.id,
                    sessionDate: new Date().toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    plannedGameIds: [],
                    ...(this.usesGroupPeople() ? { groupPersonIds: ids } : { attendeeIds: ids }),
                }),
            )
            this.dataService.refreshUserMeets()
            await this.router.navigate(['/sessions', session.sessionId])
        } catch {
            this.recordingError.set('Could not start the night. Your choices are still here; try again.')
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

    public sessionSuggestionLabel(sessionId: number): string {
        const history = (this.dataService.userHistory?.() ?? []).find((record) => record.meetData.id === sessionId)
        return history?.gamesPlayed.map((play) => this.getGameTitle(play.gameData)).join(', ') || 'View people and games'
    }
    public primaryPlayers(gameId: number): number[] {
        return this.matrix()
            .filter((cell) => cell.gameId === gameId && cell.selected)
            .map((cell) => cell.attendeeId)
    }
    public playerName(id: number): string {
        const attendee = this.attendees().find((attendee) => attendee.user.id === id)
        return attendee?.user.displayName || attendee?.user.username || 'Player'
    }
    public playTitle(gameId: number): string {
        const game = this.games().find((selection) => selection.game.id === gameId)?.game
        return game ? this.getGameTitle(game) : 'Game'
    }
    public namesForPlay(play: CreatePlaySessionRequest['games'][number]): string {
        return [...(play.participantIds ?? []), ...(play.participantPersonIds ?? [])].map((id) => this.playerName(id)).join(', ')
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
