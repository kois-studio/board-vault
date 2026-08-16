import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import type { GroupWithMembersAndGames, RecommendationsType } from '../../../api/api.types'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, ContainerWrapperComponent, PageHeaderComponent],
    templateUrl: 'recommendations-page.component.html',
})
export class RecommendationsPageComponent {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)

    public readonly userGroups = this.dataService.userGroups
    public readonly selectedGroupId = signal<number | null>(null)
    public readonly selectedAttendeeIds = signal<Array<number>>([])
    public readonly availableMinutes = signal<number | null>(120)
    public readonly recommendations = signal<RecommendationsType | null>(null)
    public readonly isLoading = signal(false)
    public readonly errorMessage = signal<string | null>(null)
    public readonly selectedGroup = computed(() => this.userGroups().find(group => group.id === this.selectedGroupId()) ?? null)

    constructor() {
        effect(() => {
            const firstGroup = this.userGroups()[0]
            if (firstGroup && this.selectedGroupId() === null) {
                this.selectGroup(firstGroup.id)
            }
        })
    }

    public selectGroup(groupId: number): void {
        const group = this.userGroups().find(candidate => candidate.id === groupId)
        this.selectedGroupId.set(group?.id ?? null)
        this.selectedAttendeeIds.set(group?.members.map(member => member.id) ?? [])
        this.recommendations.set(null)
        this.errorMessage.set(null)
    }

    public toggleAttendee(accountId: number): void {
        this.selectedAttendeeIds.update(ids => ids.includes(accountId) ? ids.filter(id => id !== accountId) : [...ids, accountId])
        this.recommendations.set(null)
    }

    public isAttendeeSelected(accountId: number): boolean {
        return this.selectedAttendeeIds().includes(accountId)
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
            this.recommendations.set(await firstValueFrom(this.api.getRecommendations({
                groupId,
                attendeeIds,
                ...(availableMinutes ? { availableMinutes } : {}),
            })))
        } catch {
            this.recommendations.set(null)
            this.errorMessage.set('Recommendations could not be loaded. Please try again.')
        } finally {
            this.isLoading.set(false)
        }
    }

    public getMemberName(group: GroupWithMembersAndGames, accountId: number): string {
        const member = group.members.find(candidate => candidate.id === accountId)
        return member?.displayName || member?.username || 'Member'
    }
}
