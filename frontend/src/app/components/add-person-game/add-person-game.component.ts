import { Component, inject, input, output, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { gameTitle } from '../../core/utils/gameTitle'
import { ToastService } from '../toast/toast.service'
import { ButtonComponent } from '../ui/button/button.component'

@Component({
    selector: 'app-add-person-game',
    imports: [ButtonComponent],
    template: `<details class="mt-3"><summary class="cursor-pointer font-medium text-bv-primary">Add a game for {{ name() }}</summary>
        <p class="mt-2 text-sm text-bv-text-muted">This records a game {{ name() }} owns in this group. Everyone in the group can see and correct it.</p>
        <form class="mt-3 flex flex-wrap gap-2" (submit)="$event.preventDefault(); search()"><label class="min-w-0 flex-1"><span class="sr-only">Search games to add for {{ name() }}</span><input class="app-input" type="search" [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Search the catalogue" /></label><button appButton variant="secondary" type="submit" [loading]="loading()">Search</button></form>
        @if (error()) { <p class="mt-2 text-sm text-bv-danger" role="alert">{{ error() }}</p> }
        @if (searched()) { <ul class="mt-3 space-y-2">@for (game of games(); track game.id) { <li class="flex flex-wrap items-center gap-3"><span class="min-w-0 flex-1 text-sm">{{ title(game) }}</span><button appButton variant="secondary" size="small" [attr.aria-label]="ownedIds().includes(game.id) || saved().includes(game.id) ? null : 'Add ' + title(game) + ' for ' + name()" [disabled]="ownedIds().includes(game.id) || saved().includes(game.id) || saving() !== null" [loading]="saving() === game.id" (click)="add(game.id)">{{ ownedIds().includes(game.id) || saved().includes(game.id) ? 'Already recorded' : 'Add' }}</button></li> } @empty { <li class="text-sm text-bv-text-muted">No matching games. Try another title.</li> }</ul> }
    </details>`,
})
export class AddPersonGameComponent {
    readonly groupId = input.required<number>()
    readonly personId = input.required<number>()
    readonly name = input.required<string>()
    readonly ownedIds = input<number[]>([])
    readonly added = output<void>()
    readonly query = signal('')
    readonly games = signal<GameCompleteType[]>([])
    readonly saved = signal<number[]>([])
    readonly loading = signal(false)
    readonly saving = signal<number | null>(null)
    readonly searched = signal(false)
    readonly error = signal('')
    readonly title = gameTitle
    private readonly api = inject(Api)
    private readonly data = inject(DataService)
    private readonly toast = inject(ToastService)
    async search(): Promise<void> {
        this.loading.set(true)
        this.error.set('')
        try {
            this.games.set(await firstValueFrom(this.api.getGroupPersonCatalog(this.groupId(), this.query())))
            this.searched.set(true)
        } catch {
            this.error.set('Could not search games. Try again.')
        } finally {
            this.loading.set(false)
        }
    }
    async add(gameId: number): Promise<void> {
        if (this.saving() !== null) return
        this.saving.set(gameId)
        this.error.set('')
        try {
            await firstValueFrom(this.api.updateGroupPersonOwnership(this.groupId(), this.personId(), gameId, 'asserted'))
            this.saved.update((ids) => [...ids, gameId])
            this.data.refreshUserGroups()
            this.added.emit()
            this.toast.success(`Game added for ${this.name()}.`)
        } catch {
            this.error.set('Could not add the game. Try again.')
        } finally {
            this.saving.set(null)
        }
    }
}
