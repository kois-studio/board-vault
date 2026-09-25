import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import type {
    GroupPersonWorkspaceType,
    GroupWithMembersAndGames,
    RecommendationSignalsType,
    RecommendationsType,
} from '../../../api/api.types'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

type RecommendationDecisionLens = 'balanced' | 'fresh' | 'favorite'

@Component({
    imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, ContainerWrapperComponent, PageHeaderComponent, CustomDatePipe],
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
    public readonly selectedGroup = computed(() => this.userGroups().find((group) => group.id === this.selectedGroupId()) ?? null)
    public readonly pageTitle = computed(() => this.getDecisionTitle(this.selectedGroup()))

    constructor() {
        effect(() => {
            const groups = this.userGroups()
            if (groups.length > 0 && this.selectedGroupId() === null) {
                const requestedGroupId = Number(this.route.snapshot.queryParamMap.get('groupId'))
                const requestedGroup = groups.find((group) => group.id === requestedGroupId)
                const group = requestedGroup ?? groups[0]
                const requestedAttendeeIds = this.readRequestedAttendeeIds(group)
                this.selectGroup(group.id, requestedAttendeeIds)
            }
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
        this.errorMessage.set(null)
    }

    public toggleAttendee(accountId: number): void {
        this.selectedAttendeeIds.update((ids) => (ids.includes(accountId) ? ids.filter((id) => id !== accountId) : [...ids, accountId]))
        this.recommendations.set(null)
        this.recommendationSignals.set(null)
        this.feedbackState.set({})
    }

    public selectAllAttendees(): void {
        const group = this.selectedGroup()
        if (!group) return

        const people = typeof this.groupPeople === 'function' ? this.groupPeople() : []

        this.selectedAttendeeIds.set(
            people.length > 0 ? people.map((person) => person.person.id) : group.members.map((member) => member.id),
        )
        this.resetRecommendationState()
    }

    public clearAttendees(): void {
        this.selectedAttendeeIds.set([])
        this.resetRecommendationState()
    }

    public setDecisionLens(value: string): void {
        if (value !== 'balanced' && value !== 'fresh' && value !== 'favorite') return

        this.decisionLens.set(value)
        this.resetRecommendationState()
    }

    public get decisionLensLabel(): string {
        switch (this.decisionLens()) {
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

        this.isLoading.set(true)
        this.errorMessage.set(null)
        try {
            const availableMinutes = this.availableMinutes()
            const groupPeople = this.groupPeople()
            this.recommendations.set(
                await firstValueFrom(
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
                ),
            )
            void this.loadRecommendationSignals(groupId)
        } catch {
            this.recommendations.set(null)
            this.errorMessage.set('Recommendations could not be loaded. Please try again.')
        } finally {
            this.isLoading.set(false)
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
        try {
            await firstValueFrom(
                this.api.createRecommendationFeedback({
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
            this.errorMessage.set('Feedback could not be saved. Please try again.')
        }
    }

    public getMemberName(group: GroupWithMembersAndGames, accountId: number): string {
        const person = this.groupPeople().find((candidate) => candidate.person.id === accountId)
        if (person) return person.person.displayName
        const member = group.members.find((candidate) => candidate.id === accountId)
        return member?.displayName || member?.username || 'Member'
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
