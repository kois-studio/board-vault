import { Component, effect, OnInit } from '@angular/core';
import { UserType } from '../../../types/user.type';
import { UserService } from '../../../core/services/user.service';

@Component({
    standalone: true,
    imports: [],
    selector: 'form-update-profile',
    templateUrl: 'form-update-profile.component.html'
})

export class FormUpdateProfileComponent implements OnInit {
    public isEditingProfileData = false
    public userData: UserType | null = null


    constructor(
        private readonly userService: UserService,
    ) {
        effect(() => {
            this.userData = this.userService.currentUser()
        })
    }
     

    ngOnInit() { }
}