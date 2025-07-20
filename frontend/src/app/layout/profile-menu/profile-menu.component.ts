import { Component, ElementRef, Renderer2, ViewChild, computed, inject } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { DataService } from '../../core/services/data.service'
import { LoginService } from '../../core/services/login.service'
import { ModalProfileInvitationsComponent } from './modals/modal-profile-invitations/modal-profile-invitations.component'
import { ModalProfileNotificationsComponent } from './modals/modal-profile-notifications/modal-profile-notifications.component'

@Component({
    imports: [ImageProfileComponent, ModalProfileInvitationsComponent, ModalProfileNotificationsComponent, RouterLink],
    selector: 'app-profile-menu',
    templateUrl: 'profile-menu.component.html',
})
export class ProfileMenuComponent {
    // --------------------------------------------------------------------------
    //        Services
    // --------------------------------------------------------------------------
    private readonly loginService = inject(LoginService)
    private readonly router = inject(Router)
    private readonly dataService = inject(DataService)
    private readonly renderer = inject(Renderer2)
    private readonly elementRef = inject(ElementRef)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userInvitations$ = this.dataService.userInvitations
    public readonly userNotifications$ = this.dataService.userNotifications
    public readonly userProposalStats$ = this.dataService.userProposalStats

    // --------------------------------------------------------------------------
    //        Component computed signals
    // --------------------------------------------------------------------------
    public readonly userUnreadNotificationsComputed = computed(() =>
        this.userNotifications$().filter((notifications) => !notifications.isRead),
    )

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isDropdownVisible = false
    private clickListener!: (() => void) | null

    // Get the child component to be able to call its methods
    @ViewChild(ModalProfileInvitationsComponent) modalProfileInvitationsComponent!: ModalProfileInvitationsComponent
    @ViewChild(ModalProfileNotificationsComponent) modalProfileNotificationsComponent!: ModalProfileNotificationsComponent

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

    public onClickSubmissions() {
        this.isDropdownVisible = false
    }

    public onClickSignOut() {
        this.loginService.logOut()
        this.dataService.currentUser.set(null)
        this.router.navigate(['/'])
    }

    // Clean up the listener when the component is destroyed
    ngOnDestroy() {
        this.removeClickListener()
    }
}
