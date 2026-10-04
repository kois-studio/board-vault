import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import type {
    GroupPersonWorkspaceType,
    GroupWithMembersAndGames,
    RecommendationSignalsType,
    RecommendationsType,
    RecommendationType,
    UserType,
} from '../../../api/api.types'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { BadgeComponent } from '../../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../../components/ui/image-background/image-background.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

type RecommendationDecisionLens = 'balanced' | 'fresh' | 'favorite'

type AttendeeOption = { id: number; name: string; avatar: UserType['avatar'] | null; games: number }

const DURATION_OPTIONS: Array<{ label: string; minutes: number | null }> = [
    { label: '30 min', minutes: 30 },
    { label: '1 h', minutes: 60 },
    { label: '1½ h', minutes: 90 },
    { label: '2 h', minutes: 120 },
    { label: '3 h', minutes: 180 },
    { label: 'No limit', minutes: null },
]
const LENS_OPTIONS: Array<RecommendationDecisionLens> = ['balanced', 'fresh', 'favorite']
const LENS_HINTS: Record<RecommendationDecisionLens, string> = {
    balanced: 'A mix of proven hits and games you have not played much.',
    fresh: 'Favours games this group has not played yet.',
    favorite: 'Favours the games this group rates and plays the most.',
}
/** Wait this long after the last change before asking for suggestions. */
const RELOAD_DELAY_MS = 300

@Component({
    imports: [
        RouterLink,
        BadgeComponent,
        ButtonComponent,
        ContainerWrapperComponent,
        IconComponent,
        ImageBackgroundComponent,
        ImageProfileComponent,
        PageHeaderComponent,
        SpinnerComponent,
        CustomDatePipe,
    ],
    templateUrl: 'recommendations-page.component.html',
})
export class RecommendationsPageComponent {
    private readonly api = inject(Api)
    private readonly route = inject(ActivatedRoute)
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    public readonly userGroups = this.dataService.userGroups
    public readonly userGroupsError = this.dataService.userGroupsError
    public readonly isLoadingGroups = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS])
    public readonly selectedGroupId = signal<number | null>(null)
    public readonly selectedAttendeeIds = signal<Array<number>>([])
    public readonly groupPeople = signal<Array<GroupPersonWorkspaceType>>([])
    public readonly groupPeopleLoading = signal(false)
    public readonly availableMinutes = signal<number | null>(120)
    public readonly decisionLens = signal<RecommendationDecisionLens>('balanced')
    public readonly recommendations = signal<RecommendationsType | null>(null)
    public readonly recommendationSignals = signal<RecommendationSignalsType | null>(null)
    public readonly isLoading = signal(false)
    public readonly errorMessage = signal<string | null>(null)
    public readonly feedbackState = signal<Record<number, 'saving' | 'interested' | 'not_for_us'>>({})
    public readonly feedbackErrors = signal<Record<number, string>>({})
    public readonly selectedGroup = computed(() => this.userGroups().find((group) => group.id === this.selectedGroupId()) ?? null)
    public readonly pageTitle = computed(() => this.getDecisionTitle(this.selectedGroup()))
    public readonly lensHint = computed(() => LENS_HINTS[this.decisionLens()])
    public readonly durationLabel = computed(() => {
        const minutes = this.availableMinutes()
        return minutes
            ? `up to ${DURATION_OPTIONS.find((option) => option.minutes === minutes)?.label ?? `${minutes} min`}`
            : 'no time limit'
    })
    /** The group's active people, or its members when the people list is unavailable. */
    public readonly attendeeOptions = computed((): Array<AttendeeOption> => {
        const group = this.selectedGroup()
        if (!group) return []
        const people = this.groupPeople().filter((person) => person.person.status === 'active')
        if (people.length === 0) {
            return group.members.map((member) => ({
                id: member.id,
                name: member.displayName || member.username,
                avatar: member.avatar,
                games: member.games.length,
            }))
        }
        return people.map((person) => ({
            id: person.person.id,
            name: person.person.displayName,
            // Linked people keep their avatar on the account.
            avatar:
                person.person.avatar ??
                group.members.find((member) => member.id === person.person.accountId)?.avatar ??
                this.initialsAvatar(person.person.displayName),
            games: this.getGroupPersonGameCount(person),
        }))
    })

    protected readonly DURATION_OPTIONS = DURATION_OPTIONS
    protected readonly LENS_OPTIONS = LENS_OPTIONS
    /** Counts requests, so a slow answer for an older choice cannot replace a newer one. */
    private requestId = 0

    constructor() {
        effect(() => {
            const groups = this.userGroups()
            if (groups.length > 0 && this.selectedGroupId() === null) {
                const requestedGroupId = Number(this.route.snapshot.queryParamMap.get('groupId'))
                const requestedGroup = groups.find((group) => group.id === requestedGroupId)
                const group = requestedGroup ?? groups[0]
                if (!group) return
                const requestedAttendeeIds = this.readRequestedAttendeeIds(group)
                this.selectGroup(group.id, requestedAttendeeIds)
            }
        })

        // Suggestions follow the choices: reload shortly after the group, people, time, or lens change.
        effect((onCleanup) => {
            const ready = this.selectedGroupId() !== null && !this.groupPeopleLoading() && this.selectedAttendeeIds().length > 0
            this.availableMinutes()
            this.decisionLens()
            if (!ready) return
            const timer = setTimeout(() => untracked(() => void this.loadRecommendations()), RELOAD_DELAY_MS)
            onCleanup(() => clearTimeout(timer))
        })
    }

    public selectGroup(groupId: number, requestedAttendeeIds?: Array<number>): void {
        const group = this.userGroups().find((candidate) => candidate.id === groupId)
        this.selectedGroupId.set(group?.id ?? null)
        this.groupPeopleLoading.set(true)
        this.api.getGroupPeople(groupId).subscribe({
            next: (response) => {
                this.groupPeople.set(response.people)
                const people = response.people.filter((person) => person.person.status === 'active')
                const requestedParticipantIds = this.readRequestedParticipantIds(group, requestedAttendeeIds, people)
                this.selectedAttendeeIds.set(requestedParticipantIds ?? people.map((person) => person.person.id))
            },
            error: () => {
                const memberIds = new Set(group?.members.map((member) => member.id) ?? [])
                const attendeeIds = requestedAttendeeIds?.filter((accountId) => memberIds.has(accountId)) ?? [...memberIds]
                this.selectedAttendeeIds.set([...new Set(attendeeIds)])
                this.groupPeople.set([])
                this.groupPeopleLoading.set(false)
            },
            complete: () => this.groupPeopleLoading.set(false),
        })
        this.recommendations.set(null)
        this.recommendationSignals.set(null)
        this.feedbackState.set({})
        this.feedbackErrors.set({})
        this.errorMessage.set(null)
    }

    public toggleAttendee(accountId: number): void {
        this.selectedAttendeeIds.update((ids) => (ids.includes(accountId) ? ids.filter((id) => id !== accountId) : [...ids, accountId]))
        this.errorMessage.set(null)
    }

    public selectAllAttendees(): void {
        const group = this.selectedGroup()
        if (!group) return

        const people = typeof this.groupPeople === 'function' ? this.groupPeople() : []

        this.selectedAttendeeIds.set(
            people.length > 0
                ? people.filter((person) => person.person.status === 'active').map((person) => person.person.id)
                : group.members.map((member) => member.id),
        )
        this.errorMessage.set(null)
    }

    public clearAttendees(): void {
        this.selectedAttendeeIds.set([])
        this.resetRecommendationState()
    }

    public setAvailableMinutes(minutes: number | null): void {
        this.availableMinutes.set(minutes)
    }

    public setDecisionLens(value: string): void {
        if (value !== 'balanced' && value !== 'fresh' && value !== 'favorite') return

        this.decisionLens.set(value)
        this.errorMessage.set(null)
    }

    public get decisionLensLabel(): string {
        return this.getDecisionLensLabel(this.decisionLens())
    }

    public getDecisionLensLabel(lens: RecommendationsType['decisionLens']): string {
        switch (lens) {
            case 'fresh':
                return 'Something new'
            case 'favorite':
                return 'Group favorite'
            default:
                return 'Balanced'
        }
    }

    public isAttendeeSelected(accountId: number): boolean {
        return this.selectedAttendeeIds().includes(accountId)
    }

    public retryGroups(): void {
        this.dataService.refreshUserGroups()
    }

    private resetRecommendationState(): void {
        this.recommendations.set(null)
        this.recommendationSignals.set(null)
        this.feedbackState.set({})
        this.errorMessage.set(null)
    }

    public async loadRecommendations(): Promise<void> {
        const groupId = this.selectedGroupId()
        const attendeeIds = this.selectedAttendeeIds()
        if (!groupId || attendeeIds.length === 0) {
            this.errorMessage.set('Select a group and at least one attendee.')
            return
        }

        const requestId = ++this.requestId
        this.isLoading.set(true)
        this.errorMessage.set(null)
        try {
            const availableMinutes = this.availableMinutes()
            const groupPeople = this.groupPeople()
            const result = await firstValueFrom(
                groupPeople.length > 0
                    ? this.api.getParticipantRecommendations({
                          groupId,
                          groupPersonIds: attendeeIds,
                          ...(availableMinutes ? { availableMinutes } : {}),
                          decisionLens: this.decisionLens(),
                      })
                    : this.api.getRecommendations({
                          groupId,
                          attendeeIds,
                          ...(availableMinutes ? { availableMinutes } : {}),
                          decisionLens: this.decisionLens(),
                      }),
            )
            if (requestId !== this.requestId) return
            this.recommendations.set(result)
            void this.loadRecommendationSignals(groupId)
        } catch {
            if (requestId !== this.requestId) return
            this.recommendations.set(null)
            this.errorMessage.set('Suggestions could not be loaded. Check your connection and try again.')
        } finally {
            if (requestId === this.requestId) this.isLoading.set(false)
        }
    }

    public async loadRecommendationSignals(groupId: number): Promise<void> {
        try {
            const signals = await firstValueFrom(this.api.getRecommendationSignals(groupId))
            this.recommendationSignals.set(signals)
            this.feedbackState.set(
                Object.fromEntries(
                    signals.signals
                        .filter((signal) => signal.yourFeedback === 'interested' || signal.yourFeedback === 'not_for_us')
                        .map((signal) => [signal.gameId, signal.yourFeedback]),
                ) as Record<number, 'interested' | 'not_for_us'>,
            )
        } catch {
            // Group signals enrich the decision surface; they should not hide usable recommendations.
            this.recommendationSignals.set(null)
        }
    }

    public getRecommendationSignal(gameId: number): RecommendationSignalsType['signals'][number] | null {
        return this.recommendationSignals()?.signals.find((signal) => signal.gameId === gameId) ?? null
    }

    public getInterestedMemberNames(signal: RecommendationSignalsType['signals'][number]): string {
        return signal.interestedBy
            .slice(0, 3)
            .map((member) => member.displayName || member.username)
            .join(', ')
    }

    public getRecommendationHistoryLabel(lastPlayedAt: string | null): string {
        return lastPlayedAt ? 'Last played by this group' : 'Not played by this group yet'
    }

    public getRecommendationParticipantIds(result: RecommendationsType): string {
        return (result.participantIds ?? result.attendeeIds).join(',')
    }

    public getDecisionTitle(group: Pick<GroupWithMembersAndGames, 'name'> | null): string {
        return group ? `What should ${group.name} play?` : 'Decide what to play'
    }

    public async saveFeedback(gameId: number, feedback: 'interested' | 'not_for_us'): Promise<void> {
        const groupId = this.selectedGroupId()
        const attendeeIds = this.selectedAttendeeIds()
        if (
            !groupId ||
            attendeeIds.length === 0 ||
            this.feedbackState()[gameId] === 'saving' ||
            this.feedbackState()[gameId] === feedback
        ) {
            return
        }

        this.feedbackState.update((state) => ({ ...state, [gameId]: 'saving' }))
        this.feedbackErrors.update((state) => {
            const nextState = { ...state }
            delete nextState[gameId]
            return nextState
        })
        try {
            await firstValueFrom(
                this.groupPeople().length > 0
                    ? this.api.createParticipantRecommendationFeedback({
                          groupId,
                          gameId,
                          participantIds: attendeeIds,
                          feedback,
                      })
                    : this.api.createRecommendationFeedback({
                          groupId,
                          gameId,
                          attendeeIds,
                          feedback,
                      }),
            )
            this.feedbackState.update((state) => ({ ...state, [gameId]: feedback }))
            void this.loadRecommendationSignals(groupId)
        } catch {
            this.feedbackState.update((state) => {
                const nextState = { ...state }
                delete nextState[gameId]
                return nextState
            })
            this.feedbackErrors.update((state) => ({ ...state, [gameId]: 'Feedback could not be saved. Try again.' }))
        }
    }

    public getGameTitle(recommendation: RecommendationType): string {
        const titles = recommendation.gameData.titleTranslations
        return titles.en || titles.es || recommendation.gameData.title || 'Untitled game'
    }

    private initialsAvatar(name: string): UserType['avatar'] {
        const initials = name
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => word[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        return { type: 'initials', initials, backgroundColor: '#64748b', iconName: null, emoji: null }
    }

    public getMemberName(group: GroupWithMembersAndGames, accountId: number): string {
        const person = this.groupPeople().find((candidate) => candidate.person.id === accountId)
        if (person) return person.person.displayName
        const member = group.members.find((candidate) => candidate.id === accountId)
        return member?.displayName || member?.username || 'Member'
    }

    public getGroupPersonGameCount(person: GroupPersonWorkspaceType): number {
        return person.ownership.filter((ownership) => ownership.status === 'asserted').length
    }

    public selectedAttendeeNames(group: GroupWithMembersAndGames): string {
        return this.selectedAttendeeIds()
            .map((accountId) => this.getMemberName(group, accountId))
            .join(', ')
    }

    private readRequestedAttendeeIds(group: GroupWithMembersAndGames): Array<number> | undefined {
        const rawValue = this.route.snapshot.queryParamMap.get('attendeeIds')
        if (!rawValue) return undefined

        const memberIds = new Set(group.members.map((member) => member.id))
        const requestedIds = rawValue
            .split(',')
            .map((value) => Number(value))
            .filter((accountId) => Number.isInteger(accountId) && memberIds.has(accountId))

        return requestedIds.length > 0 ? [...new Set(requestedIds)] : undefined
    }

    private readRequestedParticipantIds(
        group: GroupWithMembersAndGames | undefined,
        requestedAttendeeIds: Array<number> | undefined,
        people: Array<GroupPersonWorkspaceType>,
    ): Array<number> | undefined {
        const rawValue = this.route.snapshot.queryParamMap.get('participantIds')
        if (rawValue) {
            const peopleIds = new Set(people.map((person) => person.person.id))
            const requestedIds = rawValue
                .split(',')
                .map((value) => Number(value))
                .filter((personId) => Number.isInteger(personId) && peopleIds.has(personId))
            if (requestedIds.length > 0) return [...new Set(requestedIds)]
        }

        if (!requestedAttendeeIds || !group) return undefined
        const requestedAccounts = new Set(requestedAttendeeIds)
        const requestedIds = people
            .filter((person) => person.person.accountId !== null && requestedAccounts.has(person.person.accountId))
            .map((person) => person.person.id)
        return requestedIds.length > 0 ? [...new Set(requestedIds)] : undefined
    }
}
