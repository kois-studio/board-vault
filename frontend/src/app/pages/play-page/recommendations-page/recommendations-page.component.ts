import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import type { GroupWithMembersAndGames, RecommendationSignalsType, RecommendationsType } from '../../../api/api.types'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

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
    public readonly availableMinutes = signal<number | null>(120)
    public readonly recommendations = signal<RecommendationsType | null>(null)
    public readonly recommendationSignals = signal<RecommendationSignalsType | null>(null)
    public readonly isLoading = signal(false)
    public readonly errorMessage = signal<string | null>(null)
    public readonly feedbackState = signal<Record<number, 'saving' | 'interested' | 'not_for_us'>>({})
    public readonly selectedGroup = computed(() => this.userGroups().find((group) => group.id === this.selectedGroupId()) ?? null)

    constructor() {
        effect(() => {
            const groups = this.userGroups()
            if (groups.length > 0 && this.selectedGroupId() === null) {
                const requestedGroupId = Number(this.route.snapshot.queryParamMap.get('groupId'))
                const requestedGroup = groups.find((group) => group.id === requestedGroupId)
                const requestedAttendeeIds = this.readRequestedAttendeeIds(requestedGroup ?? groups[0])
                this.selectGroup((requestedGroup ?? groups[0]).id, requestedAttendeeIds)
            }
        })
    }

    public selectGroup(groupId: number, requestedAttendeeIds?: Array<number>): void {
        const group = this.userGroups().find((candidate) => candidate.id === groupId)
        this.selectedGroupId.set(group?.id ?? null)
        const memberIds = new Set(group?.members.map((member) => member.id) ?? [])
        const attendeeIds = requestedAttendeeIds?.filter((accountId) => memberIds.has(accountId)) ?? [...memberIds]
        this.selectedAttendeeIds.set([...new Set(attendeeIds)])
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

    public isAttendeeSelected(accountId: number): boolean {
        return this.selectedAttendeeIds().includes(accountId)
    }

    public retryGroups(): void {
        this.dataService.refreshUserGroups()
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
            this.recommendations.set(
                await firstValueFrom(
                    this.api.getRecommendations({
                        groupId,
                        attendeeIds,
                        ...(availableMinutes ? { availableMinutes } : {}),
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
}
