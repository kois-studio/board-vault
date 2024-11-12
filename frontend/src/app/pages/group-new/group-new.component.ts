import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CommonModule, ImageProfileComponent, ReactiveFormsModule],
    templateUrl: 'group-new.component.html',
})
export class GroupNewComponent {
    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupNameForm = new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(20)])
    public isLoading = false

    constructor(
        private readonly router: Router,
        private readonly dataService: DataService,
    ) {}

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

    onGoBack() {
        this.router.navigate(['/dashboard'])
    }

    onCreateGroup() {
        if (!this.groupNameForm.value) return
        this.isLoading = true

        this.dataService.createGroup(this.groupNameForm.value)
        // clear input
        this.groupNameForm.reset()
        this.isLoading = false
        this.router.navigate(['/dashboard'])
    }
}
