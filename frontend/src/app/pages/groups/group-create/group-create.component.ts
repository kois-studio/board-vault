import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [CommonModule, ReactiveFormsModule, ButtonComponent, RouterLink],
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

    get groupName() {
        return this.groupNameForm.get('groupName')
    }

    get groupNameClass() {
        if (!this.groupNameForm.dirty && !this.groupNameForm.touched) return ''
        return this.groupNameForm.valid ? 'border-green-500' : 'border-red-500'
    }

    get disableCreateButton() {
        if (!this.groupNameForm.value) {
            return true
        }
        return this.isLoading || this.groupNameForm.invalid
    }

    onCreateGroup() {
        if (!this.groupNameForm.value) return
        this.isLoading = true

        this.dataService.createGroup(this.groupNameForm.value)
        // clear input
        this.groupNameForm.reset()
        this.isLoading = false

        this.router.navigate(['/groups'])
    }
}
