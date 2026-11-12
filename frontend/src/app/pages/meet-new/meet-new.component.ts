import { afterNextRender, Component, computed, DestroyRef, ElementRef, effect, Injector, inject, signal, untracked } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType, GroupPersonWorkspaceType, PublicUserType, ScheduleSessionRequest } from '../../api/api.types'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { SkeletonPeopleGridComponent } from '../../components/skeletons/skeleton-people-grid/skeleton-people-grid.component'
import { ToastService } from '../../components/toast/toast.service'
import { BackLinkComponent } from '../../components/ui/back-link/back-link.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { isPending } from '../../core/async/resource-state'
import { formatDateTime } from '../../core/i18n/format'
import { PlayersPipe } from '../../core/pipes/count.pipe'
import { CoverAltPipe } from '../../core/pipes/game-title.pipe'
import { DataService } from '../../core/services/data.service'
import { isSaveOutcomeUnknown } from '../../core/utils/apiUnavailable'
import { gameTitle } from '../../core/utils/gameTitle'
import { canTakePart } from '../../core/utils/groupPeople'
import { SubmissionKey } from '../../core/utils/submissionKey'

/** Someone who can be invited: a member account, or a group person when the group has them. */
export type PlanPerson = { id: number; name: string; avatar: PublicUserType['avatar']; gameIds: Set<number> }

export type PlanGame = { game: GameCompleteType; title: string; owners: Array<string>; fits: boolean }

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_START_TIME = '19:00'

/** Today if the default start is still ahead, otherwise tomorrow, so the form never opens on a time that has passed. */
export function defaultSessionDay(now: Date): string {
    const today = localDate(now)
    return startTime(today, DEFAULT_START_TIME) > now.getTime() ? today : localDate(new Date(now.getTime() + DAY_MS))
}

/** The chosen day and time as one instant, in the browser's timezone; NaN until both are set. */
function startTime(date: string | null, time: string | null): number {
    return date && time ? new Date(`${date}T${time}`).getTime() : Number.NaN
}

/** YYYY-MM-DD in the browser's timezone. */
function localDate(date: Date): string {
    const offset = date.getTimezoneOffset() * 60 * 1000
    return new Date(date.getTime() - offset).toISOString().slice(0, 10)
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
        SkeletonPeopleGridComponent,
        CoverAltPipe,
        PlayersPipe,
        ReactiveFormsModule,
        RouterLink,
        BackLinkComponent,
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
    private readonly destroyRef = inject(DestroyRef)
    private readonly injector = inject(Injector)
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

    public readonly today = localDate(new Date())
    public readonly localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    public readonly dateForm = new FormControl(defaultSessionDay(new Date()), [
        Validators.required,
        (control) => (control.value && control.value < this.today ? { futureDate: true } : null),
    ])
    public readonly timeForm = new FormControl(DEFAULT_START_TIME, [Validators.required])
    private readonly dateValue = toSignal(this.dateForm.valueChanges, { initialValue: this.dateForm.value })
    private readonly timeValue = toSignal(this.timeForm.valueChanges, { initialValue: this.timeForm.value })
    /** Set again on "Plan game night", so a time that passed while the page was open is caught then. */
    private readonly checkedAt = signal(Date.now())
    /** A start earlier than the current minute: that night is today but already under way or over. */
    public readonly startsInThePast = computed(() => {
        const now = Math.max(this.checkedAt(), Date.now())

        return startTime(this.dateValue(), this.timeValue()) < Math.floor(now / 60_000) * 60_000
    })

    public readonly groupPeople = signal<Array<GroupPersonWorkspaceType>>([])
    private readonly personCatalog = signal<Array<GameCompleteType>>([])
    public readonly selectedAttendeeIds = signal<Array<number>>([])
    public readonly selectedPlannedGameIds = signal<Array<number>>([])
    public readonly notes = signal('')
    public readonly gameQuery = signal('')
    public readonly isCreating = signal(false)
    /** Keeps one key for every try of the same plan, so a retry after an unconfirmed save never plans it twice (#246). */
    private readonly submission = new SubmissionKey<ScheduleSessionRequest>()
    private initializedGroupId: number | null = null
    /** The group's people (and the games only they own) are on their way; who to invite can't be settled yet. */
    public readonly peopleLoading = signal(false)
    /** The group's people couldn't be loaded, so people without an account would be missing from the list. */
    public readonly peopleError = signal(false)
    /** People asked for by a recommendation ("Plan this"), kept so Retry can pick them again. */
    private requestedIds: Array<number> = []
    /** Bumped on every load, so only the newest answer is applied. */
    private peopleLoadVersion = 0

    protected readonly groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '', 10)

    public readonly groupData = computed(() => {
        if (!this.dataService.currentUser()) return null
        return this.dataService.userGroups().find((group) => group.id === this.groupId) ?? null
    })

    /** How many people the group says it has, for the tiles held while its people load (#261). */
    public readonly expectedPeople = computed(() => {
        const group = this.groupData()
        return group ? group.members.length + (group.placeholders?.length ?? 0) : 3
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
            .filter(canTakePart)
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
            { label: $localize`:Quick date button when planning a game night:Today`, value: this.today },
            { label: $localize`:Quick date button when planning a game night, the coming Friday:Friday`, value: nextWeekday(5) },
            { label: $localize`:Quick date button when planning a game night, the coming Saturday:Saturday`, value: nextWeekday(6) },
            {
                label: $localize`:Quick date button when planning a game night, the Friday after the coming one:Next Friday`,
                value: nextWeekday(5, 1),
            },
        ].filter((option, index, options) => options.findIndex((other) => other.value === option.value) === index)
    })

    public readonly whenSummary = computed(() => {
        const date = this.dateValue()
        const time = this.timeValue()
        const missing = $localize`:Summary at the bottom of the plan form before a day and time are chosen:Choose a day and time`
        if (!date || !time) return missing
        const start = new Date(`${date}T${time}`)
        if (Number.isNaN(start.getTime())) return missing
        const day = formatDateTime(start, { weekday: 'short', day: 'numeric', month: 'short' })
        return `${day} · ${time}`
    })

    public readonly canCreate = computed(
        () =>
            !this.isCreating() &&
            Boolean(this.dateValue()) &&
            Boolean(this.timeValue()) &&
            (this.dateValue() ?? '') >= this.today &&
            !this.startsInThePast() &&
            !this.peopleLoading() &&
            !this.peopleError() &&
            this.selectedAttendeeIds().length > 0,
    )

    public readonly isLoadingGroups = computed(() => isPending(this.dataService.userGroupsState()))
    public readonly groupsError = computed(() => this.dataService.userGroupsState().status === 'error')
    public readonly groupUnavailable = computed(() => !this.isLoadingGroups() && !this.groupsError() && this.groupData() === null)

    constructor() {
        effect(() => {
            const group = this.groupData()
            untracked(() => {
                if (!group) {
                    this.initializedGroupId = null
                    this.peopleLoadVersion++
                    this.peopleLoading.set(false)
                    this.peopleError.set(false)
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
        return gameTitle(game)
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
        if (entry.owners.length === 0) {
            return $localize`:Under a game in the plan form's shortlist when none of the invited people own it:Nobody invited owns it`
        }
        // Commas only, as the list may be cut short before the "+2".
        const names = entry.owners.slice(0, 2).join(', ')
        if (entry.owners.length <= 2) {
            return $localize`:Under a game in the plan form's shortlist, who can bring it; the placeholder is one or two names:Bring: ${names}:names:`
        }
        return $localize`:Under a game in the plan form's shortlist, who can bring it; one or two names, then how many more:Bring: ${names}:names: +${entry.owners.length - 2}:count:`
    }

    /** Loads the group's people again after it failed. */
    retryGroupPeople(): void {
        const group = this.groupData()
        if (!group || this.peopleLoading()) return
        void this.loadGroupPeople(group.id, this.requestedIds, true)
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
        this.checkedAt.set(Date.now())
        if (!this.canCreate()) return

        const body: ScheduleSessionRequest = {
            groupId: group.id,
            sessionDate: new Date(`${sessionDate}T${sessionTime}`).toISOString(),
            timezone: this.localTimezone,
            notes: this.notes().trim() || undefined,
            ...(this.useGroupPeople() ? { groupPersonIds: this.selectedAttendeeIds() } : { attendeeIds: this.selectedAttendeeIds() }),
            plannedGameIds: this.selectedPlannedGameIds(),
        }
        const { key, request } = this.submission.prepare(body, () => body)

        this.isCreating.set(true)
        try {
            await firstValueFrom(this.api.scheduleSession(request, key))
            this.submission.clear()
            this.dataService.refreshUserMeets()
            this.toastService.success($localize`:Toast after planning a game night:Game night planned.`)
            await this.router.navigate(['/play/upcoming-sessions'])
        } catch (error) {
            if (isSaveOutcomeUnknown(error)) {
                this.submission.keep()
                this.dataService.refreshUserMeets()
                this.toastService.error(
                    $localize`:Toast when Board Vault did not answer in time after planning a game night, so it may or may not be planned:We couldn’t confirm the game night was planned. Try again without changing anything and it won’t be planned twice.`,
                )
            } else {
                this.submission.clear()
                this.toastService.error(
                    $localize`:Toast when a game night could not be planned:Could not plan the game night. Please try again.`,
                )
            }
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

        this.requestedIds = requestedIds
        this.peopleError.set(false)
        void this.loadGroupPeople(group.id, requestedIds)
    }

    /**
     * Loads the group's people and the games only they own, and applies both at once. If either
     * can't be loaded, the page says so rather than inviting only the member accounts.
     */
    private async loadGroupPeople(groupId: number, requestedIds: Array<number>, retrying = false): Promise<void> {
        const version = ++this.peopleLoadVersion
        const isCurrent = () => this.peopleLoadVersion === version && this.initializedGroupId === groupId
        this.peopleLoading.set(true)
        try {
            const { people } = await firstValueFrom(this.api.getGroupPeople(groupId))
            // A group without people (yet) invites member accounts, as before.
            const catalog = people.length === 0 ? [] : await firstValueFrom(this.api.getGroupPersonCatalog(groupId))
            if (!isCurrent()) return
            this.peopleLoading.set(false)
            this.peopleError.set(false)
            if (retrying) this.#focusFirstPerson()
            if (people.length === 0) return
            this.groupPeople.set(people)
            this.personCatalog.set(catalog)

            const activeIds = this.people().map((person) => person.id)
            const requested = requestedIds.filter((id) => activeIds.includes(id))
            this.selectedAttendeeIds.set(requested.length > 0 ? [...new Set(requested)] : activeIds)
        } catch {
            if (!isCurrent()) return
            this.peopleLoading.set(false)
            this.peopleError.set(true)
        }
    }

    /** The Retry button goes away once the people load: put focus on the first person instead of losing it. */
    #focusFirstPerson(): void {
        afterNextRender(
            () => {
                if (this.destroyRef.destroyed) return
                const active = document.activeElement
                if (active !== null && active !== document.body) return
                this.host.nativeElement.querySelector<HTMLElement>('[data-testid="people-grid"] button')?.focus()
            },
            { injector: this.injector },
        )
    }
}
