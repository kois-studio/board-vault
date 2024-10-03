import { Component, ElementRef, Renderer2, ViewChild, effect } from '@angular/core'
import { Router } from '@angular/router'
import { LocalStorageService } from '../../core/services/local-storage.service'
import { UserService } from '../../core/services/user.service'
import { UserType } from '../../types/user.type'
import { ProfileSettingsComponent } from '../profile-settings/profile-settings.component'

@Component({
    standalone: true,
    imports: [ProfileSettingsComponent],
    selector: 'app-profile-menu',
    templateUrl: 'profile-menu.component.html',
})
export class ProfileMenuComponent {
    public isDropdownVisible = false
    public userData: UserType | null = null

    // Get the child component to be able to call its methods
    @ViewChild(ProfileSettingsComponent) profileSettingsComponent!: ProfileSettingsComponent

    private clickListener!: (() => void) | null

    constructor(
        private readonly router: Router,
        private readonly userService: UserService,
        private readonly localStorageService: LocalStorageService,
        // these 2 are used to being able to close the dropdown when clicking outside of it
        private readonly renderer: Renderer2,
        private readonly elementRef: ElementRef,
    ) {
        effect(() => {
            this.userData = this.userService.currentUser()
        })
    }

    // Method to toggle the dropdown
    toggleDropdown() {
        this.isDropdownVisible = !this.isDropdownVisible

        // If dropdown is visible, attach the click listener
        if (this.isDropdownVisible) {
            this.clickListener = this.renderer.listen('document', 'click', (event: MouseEvent) => {
                this.handleOutsideClick(event)
            })
        } else {
            this.removeClickListener()
        }
    }

    // Handle clicking outside the dropdown
    handleOutsideClick(event: MouseEvent) {
        const clickedInside = this.elementRef.nativeElement.contains(event.target)
        if (!clickedInside) {
            this.isDropdownVisible = false
            this.removeClickListener()
        }
    }

    // Remove the click listener to avoid memory leaks
    removeClickListener() {
        if (this.clickListener) {
            this.clickListener()
            this.clickListener = null
        }
    }

    // #region Methods
    public onClickProfileSettings() {
        this.profileSettingsComponent.showDialog()
        this.isDropdownVisible = false
    }

    public onClickSignOut() {
        this.localStorageService.deleteToken()
        this.router.navigate(['/'])
    }

    // Clean up the listener when the component is destroyed
    ngOnDestroy() {
        this.removeClickListener()
    }
}
