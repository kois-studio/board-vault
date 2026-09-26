import { CommonModule } from '@angular/common'
import { Component, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'

import { Api } from '../../api/api'
import type { GameType, GroupPersonWorkspaceType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'

@Component({
    imports: [CommonModule, RouterLink],
    templateUrl: './group-person-claim.component.html',
})
export class GroupPersonClaimComponent {
    private readonly api = inject(Api)
    public readonly route = inject(ActivatedRoute)
    private readonly router = inject(Router)
    private readonly toastService = inject(ToastService)

    public readonly isLoading = signal(true)
    public readonly isSaving = signal(false)
    public readonly error = signal<string | null>(null)
    public readonly person = signal<GroupPersonWorkspaceType | null>(null)
    public readonly games = signal<Array<GameType>>([])
    public readonly selectedOwnership = signal<Set<number>>(new Set())
    public readonly selectedPreferences = signal<Set<number>>(new Set())
    public readonly importOwnership = signal(false)

    constructor() {
        void this.load()
    }

    public gameTitle(gameId: number): string {
        const game = this.games().find((candidate) => candidate.id === gameId)
        return game?.title || `Game #${gameId}`
    }

    public toggleOwnership(gameId: number): void {
        this.selectedOwnership.update((selected) => this.toggle(selected, gameId))
    }

    public togglePreference(gameId: number): void {
        this.selectedPreferences.update((selected) => this.toggle(selected, gameId))
    }

    public async claim(): Promise<void> {
        const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
        const personId = Number.parseInt(this.route.snapshot.paramMap.get('personId') || '')
        if (Number.isNaN(groupId) || Number.isNaN(personId) || !this.person() || this.isSaving()) return

        this.isSaving.set(true)
        try {
            await firstValueFrom(
                this.api.claimGroupPerson(groupId, personId, {
                    ownershipGameIds: [...this.selectedOwnership()],
                    preferenceGameIds: [...this.selectedPreferences()],
                    importOwnershipToCollection: this.importOwnership(),
                }),
            )
            this.toastService.success('Your group history is now linked to your account.')
            await this.router.navigate(['/groups', groupId])
        } catch {
            this.error.set('This claim could not be completed. The invitation may have expired or already been used.')
        } finally {
            this.isSaving.set(false)
        }
    }

    public async joinAsNewPerson(): Promise<void> {
        const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
        if (Number.isNaN(groupId) || this.isSaving()) return

        this.isSaving.set(true)
        try {
            await firstValueFrom(this.api.joinGroupAsNewPerson(groupId))
            this.toastService.success('You joined the group as a new person.')
            await this.router.navigate(['/groups', groupId])
        } catch {
            this.error.set('We could not add you as a new group person. Please try again.')
        } finally {
            this.isSaving.set(false)
        }
    }

    private async load(): Promise<void> {
        const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
        const personId = Number.parseInt(this.route.snapshot.paramMap.get('personId') || '')
        if (Number.isNaN(groupId) || Number.isNaN(personId)) {
            this.error.set('This group person link is not valid.')
            this.isLoading.set(false)
            return
        }

        try {
            const [peopleResponse, games] = await Promise.all([
                firstValueFrom(this.api.getGroupPeople(groupId)),
                firstValueFrom(this.api.getGames()),
            ])
            const candidate = peopleResponse.people.find((item) => item.person.id === personId)
            if (!candidate || !candidate.claimable || candidate.person.kind !== 'placeholder') {
                this.error.set('This group person is not available for your account.')
                return
            }

            this.person.set(candidate)
            this.games.set(games)
            this.selectedOwnership.set(new Set(candidate.ownership.filter((item) => item.status === 'asserted').map((item) => item.gameId)))
            this.selectedPreferences.set(new Set(candidate.preferences.map((item) => item.gameId)))
        } catch {
            this.error.set('We could not load the group person data. Please try again.')
        } finally {
            this.isLoading.set(false)
        }
    }

    private toggle(current: Set<number>, gameId: number): Set<number> {
        const next = new Set(current)
        if (next.has(gameId)) next.delete(gameId)
        else next.add(gameId)
        return next
    }
}
