import { Component, EventEmitter, inject, Output, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Api } from '../../../api/api'
import type { TagCategoryType, TagType } from '../../../api/api.types'
import { LogService } from '../../../core/services/log.service'
import { ToastService } from '../../toast/toast.service'
import { ButtonComponent } from '../../ui/button/button.component'
import { DialogDirective } from '../../ui/dialog/dialog.directive'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    imports: [ReactiveFormsModule, ButtonComponent, DialogDirective, IconComponent],
    selector: 'app-modal-edit-tag',
    templateUrl: './modal-edit-tag.component.html',
})
export class ModalEditTagComponent {
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly api = inject(Api)

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isVisible = signal<boolean>(false)
    public tag = signal<TagType | null>(null)
    public categories = signal<Array<TagCategoryType>>([])
    public isLoading = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        Events
    // --------------------------------------------------------------------------
    @Output() tagUpdated = new EventEmitter<{ id: number; name: string; categoryId: number }>()

    // --------------------------------------------------------------------------
    //        Form
    // --------------------------------------------------------------------------
    public editTagForm = new FormGroup({
        name: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
        categoryId: new FormControl<number | null>(null, [Validators.required]),
    })

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showDialog(tag: TagType, categories: Array<TagCategoryType>): void {
        this.tag.set(tag)
        this.categories.set(categories)
        this.editTagForm.setValue({
            name: tag.name,
            categoryId: tag.categoryId,
        })
        this.isVisible.set(true)
    }

    public hideDialog(): void {
        this.isVisible.set(false)
        this.tag.set(null)
        this.categories.set([])
        this.editTagForm.reset()
    }

    public onSubmit(): void {
        if (this.editTagForm.invalid || !this.tag()) {
            return
        }

        const formValue = this.editTagForm.value
        if (!formValue.name || !formValue.categoryId) return

        const tag = this.tag()
        if (!tag) {
            this.toastService.error('Tag not found')
            return
        }

        this.isLoading.set(true)

        // Call API to update tag
        this.api
            .updateAdminTag(tag.id, {
                name: formValue.name,
                categoryId: formValue.categoryId,
            })
            .subscribe({
                next: (updatedTag: TagType) => {
                    this.isLoading.set(false)
                    this.toastService.success('Tag updated successfully!')
                    this.tagUpdated.emit({
                        id: updatedTag.id,
                        name: updatedTag.name,
                        categoryId: updatedTag.categoryId,
                    })
                    this.hideDialog()
                },
                error: (error: any) => {
                    this.isLoading.set(false)
                    this.logger.error('Error updating tag:', error)
                    this.toastService.error('Failed to update tag. Please try again.')
                },
            })
    }

    // --------------------------------------------------------------------------
    //        Form helpers
    // --------------------------------------------------------------------------
    get nameControl() {
        return this.editTagForm.get('name')
    }

    get categoryIdControl() {
        return this.editTagForm.get('categoryId')
    }

    get nameClass() {
        if (!this.nameControl?.dirty && !this.nameControl?.touched) return ''
        return this.nameControl?.valid ? 'border-green-500' : 'border-red-500'
    }

    get categoryIdClass() {
        if (!this.categoryIdControl?.dirty && !this.categoryIdControl?.touched) return ''
        return this.categoryIdControl?.valid ? 'border-green-500' : 'border-red-500'
    }

    get isFormValid() {
        return this.editTagForm.valid && this.editTagForm.dirty
    }
}
