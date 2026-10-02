import { Component, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [ReactiveFormsModule, ButtonComponent],
    templateUrl: 'group-create.component.html',
})
export class GroupCreateComponent {
    private readonly router = inject(Router)
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupNameForm = new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(20)])
    public isLoading = false
    public readonly createError = signal<string | null>(null)
    public readonly currentUser$ = this.dataService.currentUser

    get groupName() {
        return this.groupNameForm
    }

    get groupNameClass() {
        if (!this.groupNameForm.dirty && !this.groupNameForm.touched) return ''
        return this.groupNameForm.valid ? 'border-green-500' : 'border-red-500'
    }

    get disableCreateButton() {
        if (!this.groupNameForm.value || !this.currentUser$()) {
            return true
        }
        return this.isLoading || this.groupNameForm.invalid
    }

    public onSubmit(event: SubmitEvent): void {
        event.preventDefault()
        void this.onCreateGroup()
    }

    async onCreateGroup() {
        this.groupNameForm.markAsTouched()
        if (!this.groupNameForm.value || this.groupNameForm.invalid || this.isLoading) return
        this.isLoading = true
        this.createError.set(null)

        try {
            const createdGroup = await firstValueFrom(this.dataService.createGroup(this.groupNameForm.value))
            this.groupNameForm.reset()
            await this.router.navigate(['/groups', createdGroup.groupId])
        } catch {
            this.createError.set('We could not create the group. Check your connection and try again; your group name is still here.')
        } finally {
            this.isLoading = false
        }
    }
}
