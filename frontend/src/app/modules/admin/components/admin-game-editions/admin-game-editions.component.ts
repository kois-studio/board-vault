import { Component, effect, input, signal } from '@angular/core'
import type { FormControl } from '@angular/forms'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { LanguageFieldComponent } from '../../../../components/ui/language-field/language-field.component'
import { languageName } from '../../../../core/i18n/language-names'
import { addEdition, type EditionRow, makePrimary, removeEdition, updateEdition } from './edition-rows'

/**
 * A game's editions: a language, a title and a "Primary" choice per row, and a button to add one.
 * The parent owns the control; the rows in it are replaced on every change, so validation is the control's.
 */
@Component({
    selector: 'app-admin-game-editions',
    imports: [ButtonComponent, IconComponent, LanguageFieldComponent],
    templateUrl: './admin-game-editions.component.html',
})
export class AdminGameEditionsComponent {
    readonly control = input.required<FormControl<ReadonlyArray<EditionRow>>>()
    /** Read-only, for a proposal already reviewed. */
    readonly readonly = input(false)

    public readonly rows = signal<ReadonlyArray<EditionRow>>([])

    constructor() {
        // Follows a value set by the parent (form.reset) as well as the edits made here.
        effect((onCleanup) => {
            const control = this.control()
            this.rows.set(control.value)
            const subscription = control.valueChanges.subscribe((rows) => this.rows.set(rows))
            onCleanup(() => subscription.unsubscribe())
        })
    }

    public get error(): string | null {
        const control = this.control()
        return control.invalid && (control.touched || control.dirty) ? ((control.errors?.['editions'] as string | undefined) ?? null) : null
    }

    public rowLabel(row: EditionRow): string {
        return row.languageCode ? languageName(row.languageCode) : 'new edition'
    }

    public add(): void {
        this.change(addEdition(this.rows()))
    }

    public remove(row: EditionRow): void {
        this.change(removeEdition(this.rows(), row.key))
    }

    public setPrimary(row: EditionRow): void {
        this.change(makePrimary(this.rows(), row.key))
    }

    public setLanguage(row: EditionRow, languageCode: string): void {
        if (languageCode !== row.languageCode) this.change(updateEdition(this.rows(), row.key, { languageCode }))
    }

    public setTitle(row: EditionRow, title: string): void {
        this.change(updateEdition(this.rows(), row.key, { title }))
    }

    private change(rows: Array<EditionRow>): void {
        const control = this.control()
        control.setValue(rows)
        control.markAsDirty()
        control.markAsTouched()
    }
}
