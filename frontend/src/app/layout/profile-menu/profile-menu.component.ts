import { Component, ElementRef, Renderer2, ViewChild, effect } from '@angular/core'
import { Router } from '@angular/router'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { DataService } from '../../core/services/data.service'
import { LocalStorageService } from '../../core/services/local-storage.service'
import { ModalProfileInvitationsComponent } from './modals/modal-profile-invitations/modal-profile-invitations.component'
import { ModalProfileNotificationsComponent } from './modals/modal-profile-notifications/modal-profile-notifications.component'
import { ModalProfileSettingsComponent } from './modals/modal-profile-settings/modal-profile-settings.component'

@Component({
    standalone: true,
    imports: [ImageProfileComponent, ModalProfileSettingsComponent, ModalProfileInvitationsComponent, ModalProfileNotificationsComponent],
    selector: 'app-profile-menu',
    templateUrl: 'profile-menu.component.html',
})
export class ProfileMenuComponent {
    public isDropdownVisible = false
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    public userInvitations: ReturnType<typeof this.dataService.userInvitations> = []
    public userUnreadNotifications: ReturnType<typeof this.dataService.userNotifications> = []

    // Get the child component to be able to call its methods
    @ViewChild(ModalProfileSettingsComponent) modalProfileSettingsComponent!: ModalProfileSettingsComponent
    @ViewChild(ModalProfileInvitationsComponent) modalProfileInvitationsComponent!: ModalProfileInvitationsComponent
    @ViewChild(ModalProfileNotificationsComponent) modalProfileNotificationsComponent!: ModalProfileNotificationsComponent

    private clickListener!: (() => void) | null

    constructor(
        private readonly router: Router,
        private readonly dataService: DataService,
        private readonly localStorageService: LocalStorageService,
        // these 2 are used to being able to close the dropdown when clicking outside of it
        private readonly renderer: Renderer2,
        private readonly elementRef: ElementRef,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userInvitations = this.dataService.userInvitations()
            this.userUnreadNotifications = this.dataService.userNotifications().filter(notifications => !notifications.isRead)
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
        this.modalProfileSettingsComponent.showDialog()
        this.isDropdownVisible = false
    }

    public onClickInvitations() {
        this.modalProfileInvitationsComponent.showDialog()
        this.isDropdownVisible = false
    }

    public onClickNotifications() {
        this.modalProfileNotificationsComponent.showDialog()
        this.isDropdownVisible = false
    }

    public onClickSignOut() {
        this.localStorageService.deleteToken()
        this.dataService.clearState()
        this.router.navigate(['/'])
    }

    // Clean up the listener when the component is destroyed
    ngOnDestroy() {
        this.removeClickListener()
    }
}
