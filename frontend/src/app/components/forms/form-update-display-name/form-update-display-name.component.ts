import { afterNextRender, Component, DestroyRef, ElementRef, effect, Injector, inject, signal, untracked, viewChild } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { DataService } from '../../../core/services/data.service'
import { isSaveOutcomeUnknown } from '../../../core/utils/apiUnavailable'
import { DISPLAY_NAME_MAX_LENGTH } from '../../../core/utils/shortName'
import { ButtonComponent } from '../../ui/button/button.component'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
    selector: 'form-update-display-name',
    templateUrl: 'form-update-display-name.component.html',
})
export class FormUpdateDisplayNameComponent {
    private readonly dataService = inject(DataService)
    private readonly injector = inject(Injector)
    private readonly destroyRef = inject(DestroyRef)
    private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput')
    private readonly editButton = viewChild('editButton', { read: ElementRef<HTMLButtonElement> })

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public readonly maxLength = DISPLAY_NAME_MAX_LENGTH
    public isEditing = false
    /** True while the new name is being saved: the form stays open, and nothing can change, until it answers. */
    public readonly isSaving = signal(false)
    /** Why the last save did not go through (#242); the typed name stays so Save can try again. */
    public readonly saveError = signal<'not-saved' | 'maybe-saved' | null>(null)

    public updateProfileFormGroup = new FormGroup({
        displayName: new FormControl(this.currentUser$()?.displayName ?? '', [
            Validators.required,
            Validators.maxLength(DISPLAY_NAME_MAX_LENGTH),
        ]),
    })

    constructor() {
        // Shows the stored name, except while editing: a fresh read of the account must not replace what is typed.
        effect(() => {
            const displayName = this.currentUser$()?.displayName ?? ''
            untracked(() => {
                if (!this.isEditing) this.updateProfileFormGroup.setValue({ displayName })
            })
        })

        // Set the form to disabled initially
        this.updateProfileFormGroup.disable()
    }

    // Form controls
    get disableSubmit() {
        const isUnchanged = this.updateProfileFormGroup.value.displayName === this.currentUser$()?.displayName
        return this.updateProfileFormGroup.invalid || isUnchanged
    }

    // Getters for form controls (shorthands)
    get displayName() {
        return this.updateProfileFormGroup.get('displayName')
    }

    // Input classes
    get displayNameClass() {
        if (!this.displayName?.dirty && !this.displayName?.touched) return ''
        return this.displayName?.valid ? 'border-bv-success' : 'border-bv-danger'
    }

    public onCancel() {
        if (this.isSaving()) return
        this.isEditing = false
        this.saveError.set(null)
        this.updateProfileFormGroup.setValue({
            displayName: this.currentUser$()?.displayName ?? '',
        })

        // Disable the form when canceling
        this.updateProfileFormGroup.disable()
        this._clearForm()
    }

    /**
     * Leaves edit mode only once the name is stored (#242). Until then the field is locked and Save shows it is busy;
     * when the save fails the field opens again with the typed name and the reason next to it.
     */
    public async onSave(): Promise<void> {
        const displayName = this.updateProfileFormGroup.value.displayName
        if (!displayName || this.isSaving()) return

        this.isSaving.set(true)
        this.saveError.set(null)
        this.updateProfileFormGroup.disable()
        try {
            await this.dataService.updateCurrentUserData({ displayName })
            this.isEditing = false
            this.updateProfileFormGroup.setValue({ displayName: this.currentUser$()?.displayName ?? displayName })
            this._clearForm()
            this.focusAfterRender(() => this.editButton()?.nativeElement)
        } catch (error) {
            this.saveError.set(isSaveOutcomeUnknown(error) ? 'maybe-saved' : 'not-saved')
            this.updateProfileFormGroup.enable()
            this.focusAfterRender(() => this.nameInput()?.nativeElement)
        } finally {
            this.isSaving.set(false)
        }
    }

    /** Save was busy (disabled) while it waited, so focus goes on to what comes next once the view shows it. */
    private focusAfterRender(target: () => HTMLElement | undefined): void {
        // Left the page while it saved: there is nothing to focus, and a destroyed view takes no render hook.
        if (this.destroyRef.destroyed) return
        afterNextRender(() => target()?.focus(), { injector: this.injector })
    }

    private _clearForm() {
        this.updateProfileFormGroup.markAsUntouched()
        this.updateProfileFormGroup.markAsPristine()
    }

    // Watch for changes in isEditing to enable/disable the form
    public toggleEditing() {
        this.isEditing = !this.isEditing
        this.saveError.set(null)
        if (this.isEditing) {
            this.updateProfileFormGroup.enable() // Enable the form when editing
            // Focus the input element directly
            const inputElement = document.querySelector('input[formControlName="displayName"]') as HTMLInputElement
            if (inputElement) {
                inputElement.focus()
            }
        } else {
            this.updateProfileFormGroup.disable() // Disable the form when not editing
        }
    }
}
