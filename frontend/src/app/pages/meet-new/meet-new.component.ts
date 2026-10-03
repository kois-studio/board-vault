import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType, GroupPersonWorkspaceType, PublicUserType } from '../../api/api.types'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ToastService } from '../../components/toast/toast.service'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'

/** Someone who can be invited: a member account, or a group person when the group has them. */
export type PlanPerson = { id: number; name: string; avatar: PublicUserType['avatar']; gameIds: Set<number> }

export type PlanGame = { game: GameCompleteType; title: string; owners: Array<string>; fits: boolean }

const DAY_MS = 24 * 60 * 60 * 1000

/** YYYY-MM-DD in the browser's timezone. */
function localDate(date: Date): string {
    const offset = date.getTimezoneOffset() * 60 * 1000
    return new Date(date.getTime() - offset).toISOString().split('T')[0]
}

function initialsAvatar(name: string): PublicUserType['avatar'] {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    return { type: 'initials', initials, backgroundColor: '#64748b', iconName: null, emoji: null }
}

@Component({
    imports: [
        ReactiveFormsModule,
        RouterLink,
        ButtonComponent,
        ContainerWrapperComponent,
        IconComponent,
        ImageBackgroundComponent,
        ImageProfileComponent,
        PageHeaderComponent,
    ],
    templateUrl: 'meet-new.component.html',
})
export class MeetNewComponent {
    private readonly route = inject(ActivatedRoute)
    private readonly dataService = inject(DataService)
    private readonly api = inject(Api)
    private readonly router = inject(Router)
    private readonly toastService = inject(ToastService)
    private readonly loadingService = inject(LoadingService)

    public readonly today = localDate(new Date())
    public readonly localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    public readonly dateForm = new FormControl(this.today, [
        Validators.required,
        (control) => (control.value && control.value < this.today ? { futureDate: true } : null),
    ])
    public readonly timeForm = new FormControl('19:00', [Validators.required])
    private readonly dateValue = toSignal(this.dateForm.valueChanges, { initialValue: this.dateForm.value })
    private readonly timeValue = toSignal(this.timeForm.valueChanges, { initialValue: this.timeForm.value })

    public readonly groupPeople = signal<Array<GroupPersonWorkspaceType>>([])
    private readonly personCatalog = signal<Array<GameCompleteType>>([])
    public readonly selectedAttendeeIds = signal<Array<number>>([])
    public readonly selectedPlannedGameIds = signal<Array<number>>([])
    public readonly notes = signal('')
    public readonly gameQuery = signal('')
    public readonly isCreating = signal(false)
    private initializedGroupId: number | null = null

    private readonly groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '', 10)

    public readonly groupData = computed(() => {
        if (!this.dataService.currentUser()) return null
        return this.dataService.userGroups().find((group) => group.id === this.groupId) ?? null
    })

    /** Groups with group people invite those; older groups invite member accounts. */
    public readonly useGroupPeople = computed(() => this.groupPeople().length > 0)

    public readonly people = computed<Array<PlanPerson>>(() => {
        const group = this.groupData()
        if (!group) return []
        if (!this.useGroupPeople()) {
            return group.members.map((member) => ({
                id: member.id,
                name: member.displayName || member.username,
                avatar: member.avatar,
                gameIds: new Set(member.games.map((game) => game.id)),
            }))
        }
        return this.groupPeople()
            .filter(({ person }) => person.status === 'active')
            .map(({ person, ownership }) => {
                const linked = person.accountId === null ? undefined : group.members.find((member) => member.id === person.accountId)
                const gameIds = new Set(ownership.filter((entry) => entry.status === 'asserted').map((entry) => entry.gameId))
                for (const game of linked?.games ?? []) gameIds.add(game.id)
                return {
                    id: person.id,
                    name: person.displayName,
                    avatar: person.avatar ?? linked?.avatar ?? initialsAvatar(person.displayName),
                    gameIds,
                }
            })
    })

    public readonly invitedPeople = computed(() => {
        const selected = new Set(this.selectedAttendeeIds())
        return this.people().filter((person) => selected.has(person.id))
    })

    /** Every game someone in the group owns, by title. */
    public readonly availableGames = computed<Array<GameCompleteType>>(() => {
        const games = new Map<number, GameCompleteType>()
        for (const member of this.groupData()?.members ?? []) {
            for (const game of member.games) games.set(game.id, game)
        }
        for (const game of this.personCatalog()) games.set(game.id, game)
        return [...games.values()].sort((a, b) => this.titleOf(a).localeCompare(this.titleOf(b)))
    })

    /** Games the invited people bring first; then the rest of the group's games. */
    public readonly shortlistGames = computed<Array<PlanGame>>(() => {
        const invited = this.invitedPeople()
        const query = this.gameQuery().trim().toLowerCase()
        return this.availableGames()
            .filter((game) => !query || this.titleOf(game).toLowerCase().includes(query))
            .map((game) => ({
                game,
                title: this.titleOf(game),
                owners: invited.filter((person) => person.gameIds.has(game.id)).map((person) => person.name),
                fits: invited.length === 0 || (game.minPlayers <= invited.length && invited.length <= game.maxPlayers),
            }))
            .sort((a, b) => Number(b.owners.length > 0) - Number(a.owners.length > 0))
    })

    public readonly quickDates = computed(() => {
        const now = new Date()
        const nextWeekday = (weekday: number, extraWeeks = 0) => {
            const days = (weekday - now.getDay() + 7) % 7
            return localDate(new Date(now.getTime() + (days + extraWeeks * 7) * DAY_MS))
        }
        return [
            { label: 'Today', value: this.today },
            { label: 'Friday', value: nextWeekday(5) },
            { label: 'Saturday', value: nextWeekday(6) },
            { label: 'Next Friday', value: nextWeekday(5, 1) },
        ].filter((option, index, options) => options.findIndex((other) => other.value === option.value) === index)
    })

    public readonly whenSummary = computed(() => {
        const date = this.dateValue()
        const time = this.timeValue()
        if (!date || !time) return 'Choose a day and time'
        const start = new Date(`${date}T${time}`)
        if (Number.isNaN(start.getTime())) return 'Choose a day and time'
        const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(start)
        return `${day} · ${time}`
    })

    public readonly canCreate = computed(
        () =>
            !this.isCreating() &&
            Boolean(this.dateValue()) &&
            Boolean(this.timeValue()) &&
            (this.dateValue() ?? '') >= this.today &&
            this.selectedAttendeeIds().length > 0,
    )

    public readonly isLoadingGroups = computed(() => Boolean(this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS]))
    public readonly groupsError = computed(() => this.dataService.userGroupsError())
    public readonly groupUnavailable = computed(() => !this.isLoadingGroups() && !this.groupsError() && this.groupData() === null)

    constructor() {
        effect(() => {
            const group = this.groupData()
            untracked(() => {
                if (!group) {
                    this.initializedGroupId = null
                    this.groupPeople.set([])
                    this.personCatalog.set([])
                    this.selectedAttendeeIds.set([])
                    this.selectedPlannedGameIds.set([])
                    return
                }
                if (this.initializedGroupId === group.id) return
                this.initializedGroupId = group.id
                this.initializeSelections()
            })
        })
    }

    titleOf(game: GameCompleteType): string {
        return game.titleTranslations.en || game.title || 'Untitled game'
    }

    isInvited(personId: number): boolean {
        return this.selectedAttendeeIds().includes(personId)
    }

    isShortlisted(gameId: number): boolean {
        return this.selectedPlannedGameIds().includes(gameId)
    }

    toggleAttendee(personId: number): void {
        this.selectedAttendeeIds.update((ids) => (ids.includes(personId) ? ids.filter((id) => id !== personId) : [...ids, personId]))
    }

    togglePlannedGame(gameId: number): void {
        this.selectedPlannedGameIds.update((ids) => (ids.includes(gameId) ? ids.filter((id) => id !== gameId) : [...ids, gameId]))
    }

    selectAllAttendees(): void {
        this.selectedAttendeeIds.set(this.people().map((person) => person.id))
    }

    clearAttendees(): void {
        this.selectedAttendeeIds.set([])
    }

    clearGames(): void {
        this.selectedPlannedGameIds.set([])
    }

    pickDate(value: string): void {
        this.dateForm.setValue(value)
        this.dateForm.markAsDirty()
    }

    ownersLabel(entry: PlanGame): string {
        if (entry.owners.length === 0) return 'Nobody invited owns it'
        if (entry.owners.length <= 2) return `Bring: ${entry.owners.join(', ')}`
        return `Bring: ${entry.owners.slice(0, 2).join(', ')} +${entry.owners.length - 2}`
    }

    retryGroups(): void {
        this.dataService.refreshUserGroups()
    }

    async onClickCreateMeeting(): Promise<void> {
        const group = this.groupData()
        const sessionDate = this.dateForm.value
        const sessionTime = this.timeForm.value

        if (!group || !sessionDate || !sessionTime || this.dateForm.invalid || this.timeForm.invalid) {
            this.dateForm.markAsTouched()
            this.timeForm.markAsTouched()
            return
        }
        if (!this.canCreate()) return

        this.isCreating.set(true)
        try {
            await firstValueFrom(
                this.api.scheduleSession({
                    groupId: group.id,
                    sessionDate: new Date(`${sessionDate}T${sessionTime}`).toISOString(),
                    timezone: this.localTimezone,
                    notes: this.notes().trim() || undefined,
                    ...(this.useGroupPeople()
                        ? { groupPersonIds: this.selectedAttendeeIds() }
                        : { attendeeIds: this.selectedAttendeeIds() }),
                    plannedGameIds: this.selectedPlannedGameIds(),
                }),
            )
            this.dataService.refreshUserMeets()
            this.toastService.success('Game night planned.')
            await this.router.navigate(['/play/upcoming-sessions'])
        } catch {
            this.toastService.error('Could not plan the game night. Please try again.')
        } finally {
            this.isCreating.set(false)
        }
    }

    /** Invitees and a game can arrive from a recommendation ("Plan this"); otherwise everyone is invited. */
    private initializeSelections(): void {
        const group = this.groupData()
        if (!group) return
        const query = this.route.snapshot.queryParamMap
        const requestedIds = (query.get('participantIds') ?? query.get('attendeeIds') ?? '')
            .split(',')
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0)
        const requestedMembers = requestedIds.filter((id) => group.members.some((member) => member.id === id))
        this.selectedAttendeeIds.set(
            requestedMembers.length > 0 ? [...new Set(requestedMembers)] : group.members.map((member) => member.id),
        )

        const requestedGameId = Number(query.get('plannedGameId'))
        this.selectedPlannedGameIds.set(
            Number.isInteger(requestedGameId) && this.availableGames().some((game) => game.id === requestedGameId) ? [requestedGameId] : [],
        )

        void this.loadGroupPeople(group.id, requestedIds)
    }

    private async loadGroupPeople(groupId: number, requestedIds: Array<number>): Promise<void> {
        try {
            const { people } = await firstValueFrom(this.api.getGroupPeople(groupId))
            if (people.length === 0) return
            this.groupPeople.set(people)

            const activeIds = this.people().map((person) => person.id)
            const requested = requestedIds.filter((id) => activeIds.includes(id))
            this.selectedAttendeeIds.set(requested.length > 0 ? [...new Set(requested)] : activeIds)
            this.personCatalog.set(await firstValueFrom(this.api.getGroupPersonCatalog(groupId)))
        } catch {
            // Without group people, the plan invites member accounts.
        }
    }
}
