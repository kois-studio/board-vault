import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Output, inject, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Api } from '../../../api/api'
import type { TagCategoryType } from '../../../api/api.types'
import { LogService } from '../../../core/services/log.service'
import { ToastService } from '../../toast/toast.service'
import { ButtonComponent } from '../../ui/button/button.component'

@Component({
    imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
    selector: 'app-modal-edit-category',
    templateUrl: './modal-edit-category.component.html',
})
export class ModalEditCategoryComponent {
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly api = inject(Api)

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isVisible = signal<boolean>(false)
    public category = signal<TagCategoryType | null>(null)
    public isLoading = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        Events
    // --------------------------------------------------------------------------
    @Output() categoryUpdated = new EventEmitter<{ id: number; name: string }>()

    // --------------------------------------------------------------------------
    //        Form
    // --------------------------------------------------------------------------
    public editCategoryForm = new FormGroup({
        name: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
    })

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showDialog(category: TagCategoryType): void {
        this.category.set(category)
        this.editCategoryForm.setValue({
            name: category.name,
        })
        this.isVisible.set(true)
    }

    public hideDialog(): void {
        this.isVisible.set(false)
        this.category.set(null)
        this.editCategoryForm.reset()
    }

    public onSubmit(): void {
        const category = this.category()
        if (this.editCategoryForm.invalid || !category) {
            return
        }

        const formValue = this.editCategoryForm.value
        if (!formValue.name) return

        this.isLoading.set(true)

        // Call API to update category
        this.api.updateAdminTagCategory(category.id, formValue.name).subscribe({
            next: (updatedCategory: TagCategoryType) => {
                this.isLoading.set(false)
                this.toastService.success('Category updated successfully!')
                this.categoryUpdated.emit({
                    id: updatedCategory.id,
                    name: updatedCategory.name,
                })
                this.hideDialog()
            },
            error: (error: any) => {
                this.isLoading.set(false)
                this.logger.error('Error updating category:', error)
                this.toastService.error('Failed to update category. Please try again.')
            },
        })
    }

    // --------------------------------------------------------------------------
    //        Form helpers
    // --------------------------------------------------------------------------
    get nameControl() {
        return this.editCategoryForm.get('name')
    }

    get nameClass() {
        if (!this.nameControl?.dirty && !this.nameControl?.touched) return ''
        return this.nameControl?.valid ? 'border-green-500' : 'border-red-500'
    }

    get isFormValid() {
        return this.editCategoryForm.valid && this.editCategoryForm.dirty
    }
}
