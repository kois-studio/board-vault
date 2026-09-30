import { Component, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'

import { Api } from '../../api/api'
import type { GameCompleteType, GroupPersonWorkspaceType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'

type ClaimSummary = {
    ownershipKept: number
    ownershipDiscarded: number
    preferencesKept: number
    preferencesDiscarded: number
    importedOwnership: boolean
}

@Component({
    imports: [RouterLink],
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
    public readonly games = signal<Array<GameCompleteType>>([])
    public readonly selectedOwnership = signal<Set<number>>(new Set())
    public readonly selectedPreferences = signal<Set<number>>(new Set())
    public readonly importOwnership = signal(false)
    public readonly claimSummary = signal<ClaimSummary | null>(null)

    public readonly ownershipKeptCount = () => this.selectedOwnership().size
    public readonly preferencesKeptCount = () => this.selectedPreferences().size

    public ownershipDiscardedCount(groupPerson: GroupPersonWorkspaceType): number {
        const availableOwnership = this.assertedOwnershipCount(groupPerson)
        return Math.max(availableOwnership - this.ownershipKeptCount(), 0)
    }

    public assertedOwnershipCount(groupPerson: GroupPersonWorkspaceType): number {
        return groupPerson.ownership.filter((item) => item.status === 'asserted').length
    }

    public preferencesDiscardedCount(groupPerson: GroupPersonWorkspaceType): number {
        return Math.max(groupPerson.preferences.length - this.preferencesKeptCount(), 0)
    }

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
        const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '', 10)
        const personId = Number.parseInt(this.route.snapshot.paramMap.get('personId') || '', 10)
        const groupPerson = this.person()
        if (Number.isNaN(groupId) || Number.isNaN(personId) || !groupPerson || this.isSaving()) return

        const ownershipGameIds = [...this.selectedOwnership()]
        const preferenceGameIds = [...this.selectedPreferences()]
        const claimSummary: ClaimSummary = {
            ownershipKept: ownershipGameIds.length,
            ownershipDiscarded: this.ownershipDiscardedCount(groupPerson),
            preferencesKept: preferenceGameIds.length,
            preferencesDiscarded: this.preferencesDiscardedCount(groupPerson),
            importedOwnership: this.importOwnership(),
        }

        this.isSaving.set(true)
        try {
            await firstValueFrom(
                this.api.claimGroupPerson(groupId, personId, {
                    ownershipGameIds,
                    preferenceGameIds,
                    importOwnershipToCollection: this.importOwnership(),
                }),
            )
            this.toastService.success('Your group history is now linked to your account.')
            this.claimSummary.set(claimSummary)
        } catch {
            this.error.set('This claim could not be completed. The invitation may have expired or already been used.')
        } finally {
            this.isSaving.set(false)
        }
    }

    public async joinAsNewPerson(): Promise<void> {
        const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '', 10)
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
        const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '', 10)
        const personId = Number.parseInt(this.route.snapshot.paramMap.get('personId') || '', 10)
        if (Number.isNaN(groupId) || Number.isNaN(personId)) {
            this.error.set('This group person link is not valid.')
            this.isLoading.set(false)
            return
        }

        try {
            const [peopleResponse, games] = await Promise.all([
                firstValueFrom(this.api.getGroupPeople(groupId)),
                firstValueFrom(this.api.getGroupPersonCatalog(groupId)),
            ])
            const candidate = peopleResponse.people.find((item) => item.person.id === personId)
            if (!candidate?.claimable || candidate.person.kind !== 'placeholder') {
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
