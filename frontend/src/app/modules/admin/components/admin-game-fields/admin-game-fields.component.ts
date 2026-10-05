import { Component, computed, effect, input, model, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import type { TagCategoryType, TagType } from '../../../../api/api.types'
import { IconComponent } from '../../../../components/ui/icon/icon.component'

export type TagGroup = { id: number; name: string; tags: Array<TagType> }

/** The catalogue fields of one game, as an admin approves or edits them. */
export function createGameFieldsForm() {
    return new FormGroup({
        titleEn: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
        titleEs: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
        imageUrl: new FormControl('', {
            nonNullable: true,
            validators: [Validators.pattern(/^https?:\/\/.+/), Validators.maxLength(2048)],
        }),
        minPlayers: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(100)]),
        maxPlayers: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(100)]),
        gameAvgDuration: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(1440)]),
    })
}

export type GameFieldsForm = ReturnType<typeof createGameFieldsForm>

/** Min players above max players: the one rule a single field cannot check. */
export function playersOutOfOrder(form: GameFieldsForm): boolean {
    const { minPlayers, maxPlayers } = form.getRawValue()
    return minPlayers !== null && maxPlayers !== null && minPlayers > maxPlayers
}

/** Tags grouped under their categories, both by name; empty categories are left out. */
export function groupTags(tags: Array<TagType>, categories: Array<TagCategoryType>): Array<TagGroup> {
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
    return categories
        .map((category) => ({
            id: category.id,
            name: category.name,
            tags: tags.filter((tag) => tag.categoryId === category.id).sort(byName),
        }))
        .filter((group) => group.tags.length > 0)
        .sort(byName)
}

/**
 * Titles, artwork with a live preview, players, length and a tag picker by category. The parent owns the form
 * and the actions; categories holding a chosen tag start open.
 */
@Component({
    selector: 'app-admin-game-fields',
    imports: [IconComponent, ReactiveFormsModule],
    templateUrl: './admin-game-fields.component.html',
})
export class AdminGameFieldsComponent {
    readonly form = input.required<GameFieldsForm>()
    readonly tagGroups = input.required<Array<TagGroup>>()
    readonly selectedTagIds = model.required<ReadonlySet<number>>()
    /** Read-only, for a proposal already reviewed. */
    readonly readonly = input(false)
    /** What the proposer typed, shown above the picker. */
    readonly proposedTags = input<Array<string>>([])
    /** Explains why players and length are required, while they are missing. */
    readonly requiredHint = input('Players and length are required. They drive Browse filters and suggestions.')

    public readonly imagePreview = signal('')
    public readonly imageFailed = signal(false)

    /** Fixed once the tags arrive, so choosing or clearing a tag never folds the category in use. */
    public readonly initiallyOpenGroups = signal<ReadonlySet<number>>(new Set())
    private openGroupsSet = false

    public readonly selectedTags = computed(() =>
        this.tagGroups()
            .flatMap((group) => group.tags)
            .filter((tag) => this.selectedTagIds().has(tag.id)),
    )

    constructor() {
        effect(() => {
            const groups = this.tagGroups()
            if (this.openGroupsSet || groups.length === 0) return
            this.openGroupsSet = true
            const selected = this.selectedTagIds()
            this.initiallyOpenGroups.set(
                new Set(groups.filter((group) => group.tags.some((tag) => selected.has(tag.id))).map((group) => group.id)),
            )
        })
        // Follows a value set by the parent (form.reset) as well as typing.
        effect((onCleanup) => {
            const control = this.form().controls.imageUrl
            this.updateImagePreview()
            const subscription = control.valueChanges.subscribe(() => this.updateImagePreview())
            onCleanup(() => subscription.unsubscribe())
        })
    }

    public get playersOutOfOrder(): boolean {
        return playersOutOfOrder(this.form())
    }

    public get missingRequired(): boolean {
        const { minPlayers, maxPlayers, gameAvgDuration } = this.form().controls
        return minPlayers.invalid || maxPlayers.invalid || gameAvgDuration.invalid
    }

    public isTagSelected(tagId: number): boolean {
        return this.selectedTagIds().has(tagId)
    }

    public selectedInGroup(group: TagGroup): number {
        return group.tags.filter((tag) => this.selectedTagIds().has(tag.id)).length
    }

    public toggleTag(tagId: number): void {
        const next = new Set(this.selectedTagIds())
        if (next.has(tagId)) next.delete(tagId)
        else next.add(tagId)
        this.selectedTagIds.set(next)
    }

    private updateImagePreview(): void {
        const control = this.form().controls.imageUrl
        this.imageFailed.set(false)
        this.imagePreview.set(control.valid ? control.value.trim() : '')
    }
}
