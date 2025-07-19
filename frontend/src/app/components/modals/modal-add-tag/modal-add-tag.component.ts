import { CommonModule } from '@angular/common'
import { Component, EventEmitter, inject, Output, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import type { TagCategoryType, TagType } from '../../../api/api.types'
import { Api } from '../../../api/api'
import { ToastService } from '../../toast/toast.service'
import { ButtonComponent } from '../../ui/button/button.component'
import { LogService } from '../../../core/services/log.service'

@Component({
    imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
    selector: 'app-modal-add-tag',
    templateUrl: './modal-add-tag.component.html',
})
export class ModalAddTagComponent {
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly api = inject(Api)

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isVisible = signal<boolean>(false)
    public categories = signal<Array<TagCategoryType>>([])
    public isLoading = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        Events
    // --------------------------------------------------------------------------
    @Output() tagCreated = new EventEmitter<TagType>()

    // --------------------------------------------------------------------------
    //        Form
    // --------------------------------------------------------------------------
    public addTagForm = new FormGroup({
        name: new FormControl('', [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(50),
        ]),
        categoryId: new FormControl<number | null>(null, [
            Validators.required,
        ]),
    })

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showDialog(categories: Array<TagCategoryType>): void {
        this.categories.set(categories)
        this.isVisible.set(true)
        this.addTagForm.reset()
    }

    public hideDialog(): void {
        this.isVisible.set(false)
        this.categories.set([])
        this.addTagForm.reset()
    }

    public onSubmit(): void {
        if (this.addTagForm.invalid) {
            return
        }

        const formValue = this.addTagForm.value
        if (!formValue.name || !formValue.categoryId) return

        this.isLoading.set(true)
        
        // Call API to create tag
        this.api.createAdminTag({
            name: formValue.name,
            categoryId: formValue.categoryId,
        }).subscribe({
            next: (newTag: TagType) => {
                this.isLoading.set(false)
                this.toastService.success('Tag created successfully!')
                this.tagCreated.emit(newTag)
                this.hideDialog()
            },
            error: (error: any) => {
                this.isLoading.set(false)
                this.logger.error('Error creating tag:', error)
                this.toastService.error('Failed to create tag. Please try again.')
            }
        })
    }

    // --------------------------------------------------------------------------
    //        Form helpers
    // --------------------------------------------------------------------------
    get nameControl() {
        return this.addTagForm.get('name')
    }

    get categoryIdControl() {
        return this.addTagForm.get('categoryId')
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
        return this.addTagForm.valid && this.addTagForm.dirty
    }
} 
