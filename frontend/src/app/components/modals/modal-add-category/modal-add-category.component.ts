import { Component, EventEmitter, Output, inject, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Api } from '../../../api/api'
import type { TagCategoryType } from '../../../api/api.types'
import { LogService } from '../../../core/services/log.service'
import { ToastService } from '../../toast/toast.service'
import { ButtonComponent } from '../../ui/button/button.component'
import { DialogDirective } from '../../ui/dialog/dialog.directive'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    imports: [ReactiveFormsModule, ButtonComponent, DialogDirective, IconComponent],
    selector: 'app-modal-add-category',
    templateUrl: './modal-add-category.component.html',
})
export class ModalAddCategoryComponent {
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly api = inject(Api)

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isVisible = signal<boolean>(false)
    public isLoading = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        Events
    // --------------------------------------------------------------------------
    @Output() categoryCreated = new EventEmitter<TagCategoryType>()

    // --------------------------------------------------------------------------
    //        Form
    // --------------------------------------------------------------------------
    public addCategoryForm = new FormGroup({
        name: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
    })

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showDialog(): void {
        this.isVisible.set(true)
        this.addCategoryForm.reset()
    }

    public hideDialog(): void {
        this.isVisible.set(false)
        this.addCategoryForm.reset()
    }

    public onSubmit(): void {
        if (this.addCategoryForm.invalid) {
            return
        }

        const formValue = this.addCategoryForm.value
        if (!formValue.name) return

        this.isLoading.set(true)

        // Call API to create category
        this.api.createAdminTagCategory(formValue.name).subscribe({
            next: (newCategory: TagCategoryType) => {
                this.isLoading.set(false)
                this.toastService.success('Category created successfully!')
                this.categoryCreated.emit(newCategory)
                this.hideDialog()
            },
            error: (error: any) => {
                this.isLoading.set(false)
                this.logger.error('Error creating category:', error)
                this.toastService.error('Failed to create category. Please try again.')
            },
        })
    }

    // --------------------------------------------------------------------------
    //        Form helpers
    // --------------------------------------------------------------------------
    get nameControl() {
        return this.addCategoryForm.get('name')
    }

    get nameClass() {
        if (!this.nameControl?.dirty && !this.nameControl?.touched) return ''
        return this.nameControl?.valid ? 'border-green-500' : 'border-red-500'
    }

    get isFormValid() {
        return this.addCategoryForm.valid && this.addCategoryForm.dirty
    }
}
