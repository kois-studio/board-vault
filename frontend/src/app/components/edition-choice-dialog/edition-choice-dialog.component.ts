import { Component, computed, inject, signal } from '@angular/core'
import { languageName } from '../../core/i18n/language-names'
import { ShelfEditionService } from '../../core/services/shelf-edition.service'
import { ButtonComponent } from '../ui/button/button.component'
import { DialogDirective } from '../ui/dialog/dialog.directive'

/** "Which edition do you own?": shows the question `ShelfEditionService` is asking, if there is one. */
@Component({
    imports: [ButtonComponent, DialogDirective],
    selector: 'app-edition-choice-dialog',
    templateUrl: './edition-choice-dialog.component.html',
})
export class EditionChoiceDialogComponent {
    private readonly shelfEditions = inject(ShelfEditionService)

    public readonly question = this.shelfEditions.question
    /** The choice made, until the question changes. */
    private readonly picked = signal<{ forQuestion: unknown; id: number | null } | null>(null)
    public readonly selectedId = computed(() => {
        const question = this.question()
        const picked = this.picked()

        return picked && picked.forQuestion === question ? picked.id : (question?.selectedId ?? null)
    })

    protected readonly languageName = languageName

    public pick(id: number | null): void {
        this.picked.set({ forQuestion: this.question(), id })
    }

    public confirm(): void {
        this.question()?.answer({ editionId: this.selectedId() })
    }

    public cancel(): void {
        this.question()?.answer(null)
    }
}
