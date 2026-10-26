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
    template: `<details class="mt-3"><summary class="cursor-pointer font-medium text-bv-primary" i18n="Opens a search in the editor of a person's games on the group page; the placeholder is the person's name">Add a game for {{ name() }}</summary>
        <p class="mt-2 text-sm text-bv-text-muted" i18n="Text of the search in the editor of a person's games on the group page; the placeholder is the person's name">This records a game {{ name() }} owns in this group. Everyone in the group can see and correct it.</p>
        <form class="mt-3 flex flex-wrap gap-2" (submit)="$event.preventDefault(); search()"><label class="min-w-0 flex-1"><span class="sr-only" i18n="Label of the search in the editor of a person's games on the group page, read by screen readers; the placeholder is the person's name">Search games to add for {{ name() }}</span><input class="app-input" type="search" [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Search the catalogue" i18n-placeholder="Placeholder of the search in the editor of a person's games on the group page" /></label><button appButton variant="secondary" type="submit" [loading]="loading()" i18n="Button of the search in the editor of a person's games on the group page">Search</button></form>
        @if (error()) { <p class="mt-2 text-sm text-bv-danger" role="alert">{{ error() }}</p> }
        @if (searched()) { <ul class="mt-3 space-y-2">@for (game of games(); track game.id) { <li class="flex flex-wrap items-center gap-3"><span class="min-w-0 flex-1 text-sm">{{ title(game) }}</span><button appButton variant="secondary" size="small" [attr.aria-label]="ownedIds().includes(game.id) || saved().includes(game.id) ? null : addLabel(game)" [disabled]="ownedIds().includes(game.id) || saved().includes(game.id) || saving() !== null" [loading]="saving() === game.id" (click)="add(game.id)">@if (ownedIds().includes(game.id) || saved().includes(game.id)) {<ng-container i18n="Button on a search result in the editor of a person's games on the group page the person already owns">Already recorded</ng-container>} @else {<ng-container i18n="Button on a search result in the editor of a person's games on the group page">Add</ng-container>}</button></li> } @empty { <li class="text-sm text-bv-text-muted" i18n="Shown when the search in the editor of a person's games on the group page finds nothing">No matching games. Try another title.</li> }</ul> }
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
    addLabel(game: GameCompleteType): string {
        return $localize`:Name of the button that adds a game to what a person owns, on the group page:Add ${gameTitle(game)}:title: for ${this.name()}:name:`
    }
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
            this.error.set(
                $localize`:Error when the search in the editor of a person's games on the group page fails:Could not search games. Try again.`,
            )
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
            this.toast.success($localize`:Toast after adding a game a person owns, on the group page:Game added for ${this.name()}:name:.`)
        } catch {
            this.error.set(
                $localize`:Error when a game could not be added in the editor of a person's games on the group page:Could not add the game. Try again.`,
            )
        } finally {
            this.saving.set(null)
        }
    }
}
