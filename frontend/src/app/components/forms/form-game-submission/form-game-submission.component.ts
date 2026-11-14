import { Component, inject, input, OnChanges, OnInit, output, SimpleChanges, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import type { CreateGameProposalType } from '../../../api/api.types'
import { pageLocale } from '../../../core/i18n/format'
import { canonicalLanguageCode } from '../../../core/i18n/language-names'
import { DataService } from '../../../core/services/data.service'
import { ToastService } from '../../toast/toast.service'
import { ButtonComponent } from '../../ui/button/button.component'

/** Where a proposed game goes for its proposer once an admin approves it. */
export type ProposalAddTo = 'shelf' | 'wishlist' | 'none'

/**
 * Proposes a game: its title, notes that help find the exact game, and where it goes once approved.
 * Everything else (editions, artwork, players, length, tags) is the admin's job at review (#325).
 */
@Component({
    imports: [ButtonComponent, ReactiveFormsModule],
    selector: 'form-game-submission',
    templateUrl: 'form-game-submission.component.html',
})
export class FormGameSubmissionComponent implements OnInit, OnChanges {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)
    private readonly toastService = inject(ToastService)

    public readonly currentUser$ = this.dataService.currentUser

    readonly initialTitle = input<string>()
    /** Whether a toast confirms the send. Off where the page itself says thank you. */
    readonly confirmWithToast = input(true)
    /** Emits where the approved game goes, so the page can say so. */
    readonly proposalSubmitted = output<ProposalAddTo>()

    public readonly isSubmitting = signal(false)
    public readonly notesMaxLength = 500

    public gameSubmissionForm = new FormGroup({
        title: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
        notes: new FormControl('', [Validators.maxLength(this.notesMaxLength)]),
        addTo: new FormControl<ProposalAddTo>('shelf', { nonNullable: true }),
    })

    public readonly addToOptions = [
        {
            value: 'shelf',
            label: $localize`:Option of the game proposal form, you own the game:I own it`,
            hint: $localize`:proposal goes to your shelf|Hint of the I own it option; once approved, the game is added to your shelf:Added to your shelf`,
        },
        {
            value: 'wishlist',
            label: $localize`:Option of the game proposal form, you want the game:I want it`,
            hint: $localize`:proposal goes to your wishlist|Hint of the I want it option; once approved, the game is added to your wishlist:Added to your wishlist`,
        },
        {
            value: 'none',
            label: $localize`:Option of the game proposal form, you neither own nor want the game:Neither`,
            hint: $localize`:Hint of the Neither option; once approved, the game is only added to the catalogue:Just add it to the catalogue`,
        },
    ] as const

    get title() {
        return this.gameSubmissionForm.controls.title
    }

    get notes() {
        return this.gameSubmissionForm.controls.notes
    }

    public async onSubmit() {
        if (this.isSubmitting()) return
        if (this.gameSubmissionForm.invalid) {
            this.gameSubmissionForm.markAllAsTouched()
            return
        }

        const currentUser = this.currentUser$()
        if (!currentUser) {
            this.toastService.error(
                $localize`:Toast when sending a game proposal while signed out:You must be logged in to submit a game proposal`,
            )
            return
        }

        this.isSubmitting.set(true)

        try {
            const { title, notes, addTo } = this.gameSubmissionForm.getRawValue()
            const trimmedNotes = notes?.trim()
            // Almost everyone proposes a game under its name in their own language; the admin corrects
            // the editions at review when it isn't.
            const titleLanguage = canonicalLanguageCode(pageLocale())
            const proposalData: CreateGameProposalType = {
                title: (title ?? '').trim(),
                ...(titleLanguage ? { titleLanguage } : {}),
                ...(trimmedNotes ? { notes: trimmedNotes } : {}),
                ...(addTo !== 'none' ? { addTo } : {}),
            }

            await firstValueFrom(this.api.createGameProposal(currentUser.id, proposalData))
            // Every way of proposing goes through here, so My submissions and the avatar menu's count
            // include the new proposal wherever it was sent from (#326).
            this.dataService.refreshUserProposals()
            this.dataService.refreshUserProposalStats()

            if (this.confirmWithToast()) {
                this.toastService.success($localize`:Toast after sending a game proposal:Game proposal submitted successfully!`)
            }
            this.proposalSubmitted.emit(addTo)
            this.gameSubmissionForm.reset()
        } catch (error) {
            console.error('Error submitting game proposal:', error)
            this.toastService.error($localize`:Toast when sending a game proposal failed:Failed to submit game proposal. Please try again.`)
        } finally {
            this.isSubmitting.set(false)
        }
    }

    ngOnInit() {
        this.applyInitialTitle()
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['initialTitle']) this.applyInitialTitle()
    }

    private applyInitialTitle(): void {
        const initialTitle = this.initialTitle()
        if (initialTitle && !this.title.value) this.title.setValue(initialTitle)
    }
}
