import { Component, inject, input, OnChanges, OnInit, output, SimpleChanges } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import type { CreateGameProposalType } from '../../../api/api.types'
import { DataService } from '../../../core/services/data.service'
import { ToastService } from '../../toast/toast.service'
import { ButtonComponent } from '../../ui/button/button.component'

@Component({
    imports: [ButtonComponent, ReactiveFormsModule],
    selector: 'form-game-submission',
    templateUrl: 'form-game-submission.component.html',
})
export class FormGameSubmissionComponent implements OnInit, OnChanges {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)
    private readonly toastService = inject(ToastService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    public readonly currentUser$ = this.dataService.currentUser

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    readonly initialTitle = input<string>()
    readonly proposalSubmitted = output<void>()

    public isSubmitting = false

    public gameSubmissionForm = new FormGroup({
        title: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
        imageUrl: new FormControl('', [Validators.pattern('https?://.+')]),
        gameAvgDuration: new FormControl<number | null>(null, [Validators.min(1), Validators.max(1440)]),
        minPlayers: new FormControl<number | null>(null, [Validators.min(1), Validators.max(20)]),
        maxPlayers: new FormControl<number | null>(null, [Validators.min(1), Validators.max(20)]),
        proposedTags: new FormControl(''),
        notes: new FormControl('', [Validators.maxLength(500)]),
    })

    // Form controls getters
    get title() {
        return this.gameSubmissionForm.get('title')
    }

    get imageUrl() {
        return this.gameSubmissionForm.get('imageUrl')
    }

    get gameAvgDuration() {
        return this.gameSubmissionForm.get('gameAvgDuration')
    }

    get minPlayers() {
        return this.gameSubmissionForm.get('minPlayers')
    }

    get maxPlayers() {
        return this.gameSubmissionForm.get('maxPlayers')
    }

    get proposedTags() {
        return this.gameSubmissionForm.get('proposedTags')
    }

    get notes() {
        return this.gameSubmissionForm.get('notes')
    }

    // Input classes
    get titleClass() {
        if (!this.title?.dirty && !this.title?.touched) return ''
        return this.title?.valid ? 'border-bv-success' : 'border-bv-danger'
    }

    get imageUrlClass() {
        if (!this.imageUrl?.dirty && !this.imageUrl?.touched) return ''
        return this.imageUrl?.valid ? 'border-bv-success' : 'border-bv-danger'
    }

    get gameAvgDurationClass() {
        if (!this.gameAvgDuration?.dirty && !this.gameAvgDuration?.touched) return ''
        return this.gameAvgDuration?.valid ? 'border-bv-success' : 'border-bv-danger'
    }

    get minPlayersClass() {
        if (!this.minPlayers?.dirty && !this.minPlayers?.touched) return ''
        return this.minPlayers?.valid ? 'border-bv-success' : 'border-bv-danger'
    }

    get maxPlayersClass() {
        if (!this.maxPlayers?.dirty && !this.maxPlayers?.touched) return ''
        return this.maxPlayers?.valid ? 'border-bv-success' : 'border-bv-danger'
    }

    get notesClass() {
        if (!this.notes?.dirty && !this.notes?.touched) return ''
        return this.notes?.valid ? 'border-bv-success' : 'border-bv-danger'
    }

    public async onSubmit() {
        if (this.gameSubmissionForm.invalid || this.isSubmitting) return

        const currentUser = this.currentUser$()
        if (!currentUser) {
            this.toastService.error('You must be logged in to submit a game proposal')
            return
        }

        this.isSubmitting = true

        try {
            const formData = this.gameSubmissionForm.value
            if (!formData.title) {
                this.toastService.error('Title is required')
                return
            }

            const proposalData: CreateGameProposalType = {
                title: formData.title,
                imageUrl: formData.imageUrl || undefined,
                gameAvgDuration: formData.gameAvgDuration || undefined,
                minPlayers: formData.minPlayers || undefined,
                maxPlayers: formData.maxPlayers || undefined,
                proposedTags: formData.proposedTags || undefined,
                notes: formData.notes || undefined,
            }

            await firstValueFrom(this.api.createGameProposal(currentUser.id, proposalData))

            this.toastService.success('Game proposal submitted successfully!')
            this.proposalSubmitted.emit()
            this.resetForm()
        } catch (error) {
            console.error('Error submitting game proposal:', error)
            this.toastService.error('Failed to submit game proposal. Please try again.')
        } finally {
            this.isSubmitting = false
        }
    }

    public resetForm() {
        this.gameSubmissionForm.reset()
        this.gameSubmissionForm.markAsUntouched()
        this.gameSubmissionForm.markAsPristine()
    }

    public validatePlayerCount() {
        const min = this.minPlayers?.value
        const max = this.maxPlayers?.value
        const errors = this.maxPlayers?.errors ?? {}

        if (min && max && min > max) {
            this.maxPlayers?.setErrors({ ...errors, invalidRange: true })
        } else if (errors['invalidRange']) {
            const { invalidRange: _invalidRange, ...remainingErrors } = errors
            this.maxPlayers?.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null)
        }
    }

    ngOnInit() {
        // Set initial title if provided
        const initialTitle = this.initialTitle()
        if (initialTitle && !this.title?.value) {
            this.title?.setValue(initialTitle)
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        const initialTitle = this.initialTitle()
        if (changes['initialTitle'] && initialTitle && !this.title?.value) {
            this.title?.setValue(initialTitle)
        }
    }
}
