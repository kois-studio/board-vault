import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Output, inject, signal } from '@angular/core'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import type { GameWithTagsAndTranslationsType } from '../../../api/api.types'
import { LogService } from '../../../core/services/log.service'
import { ToastService } from '../../toast/toast.service'
import { ButtonComponent } from '../../ui/button/button.component'

type SupportedLanguage = 'en' | 'es'

@Component({
    selector: 'app-modal-edit-game-translations',
    imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
    templateUrl: './modal-edit-game-translations.component.html',
})
export class ModalEditGameTranslationsComponent {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly fb = inject(FormBuilder)

    // --------------------------------------------------------------------------
    //        Signals
    // --------------------------------------------------------------------------
    public isVisible = signal<boolean>(false)
    public isLoading = signal<boolean>(false)
    public game = signal<GameWithTagsAndTranslationsType | null>(null)

    // --------------------------------------------------------------------------
    //        Form
    // --------------------------------------------------------------------------
    public form: FormGroup = this.fb.group({
        en: ['', [Validators.required, Validators.minLength(1)]],
        es: ['', [Validators.required, Validators.minLength(1)]],
    })

    // --------------------------------------------------------------------------
    //        Events
    // --------------------------------------------------------------------------
    @Output() public translationsUpdated = new EventEmitter<{ id: number; translations: Record<SupportedLanguage, string> }>()

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------

    public showDialog(game: GameWithTagsAndTranslationsType): void {
        this.game.set(game)
        this.form.patchValue({
            en: game.translations.en || '',
            es: game.translations.es || '',
        })
        this.isVisible.set(true)
    }

    public hideDialog(): void {
        this.isVisible.set(false)
        this.game.set(null)
        this.form.reset()
    }

    public async onSubmit(): Promise<void> {
        this.logger.log('Modal onSubmit called')

        if (this.form.invalid || !this.game()) {
            this.logger.log('Form invalid or no game:', this.form.invalid, !this.game())
            return
        }

        this.isLoading.set(true)

        try {
            const translations: Record<SupportedLanguage, string> = {
                en: this.form.get('en')?.value?.trim() || '',
                es: this.form.get('es')?.value?.trim() || '',
            }

            this.logger.log('Updating translations for game:', this.game()?.id, translations)

            await firstValueFrom(this.api.updateAdminGameTranslations(this.game()?.id, translations))

            this.logger.log('Translation update successful, emitting event')
            this.toastService.success('Game translations updated successfully.')

            const eventData = {
                id: this.game()?.id,
                translations,
            }
            this.logger.log('Emitting event with data:', eventData)
            this.translationsUpdated.emit(eventData)
            this.logger.log('Event emitted successfully')

            this.hideDialog()
        } catch (error) {
            this.logger.error('Error updating game translations', error)
            this.toastService.error('Failed to update game translations.')
        } finally {
            this.isLoading.set(false)
        }
    }

    public onCancel(): void {
        this.hideDialog()
    }
}
