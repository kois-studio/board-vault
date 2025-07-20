import { Component, ElementRef, Renderer2, ViewChild, effect, inject } from '@angular/core'
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
    private readonly loginService = inject(LoginService)

    public isDropdownVisible = false
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    public userInvitations: ReturnType<typeof this.dataService.userInvitations> = []
    public userUnreadNotifications: ReturnType<typeof this.dataService.userNotifications> = []
    public userProposalStats: ReturnType<typeof this.dataService.userProposalStats> = {
        totalProposals: 0,
        approvedProposals: 0,
        rejectedProposals: 0,
        duplicateProposals: 0,
        pendingProposals: 0,
        approvalRate: 0,
        reputationScore: 0,
    }

    // Get the child component to be able to call its methods
    @ViewChild(ModalProfileInvitationsComponent) modalProfileInvitationsComponent!: ModalProfileInvitationsComponent
    @ViewChild(ModalProfileNotificationsComponent) modalProfileNotificationsComponent!: ModalProfileNotificationsComponent

    private clickListener!: (() => void) | null

    constructor(
        private readonly router: Router,
        private readonly dataService: DataService,
        // these 2 are used to being able to close the dropdown when clicking outside of it
        private readonly renderer: Renderer2,
        private readonly elementRef: ElementRef,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userInvitations = this.dataService.userInvitations()
            this.userUnreadNotifications = this.dataService.userNotifications().filter((notifications) => !notifications.isRead)
            this.userProposalStats = this.dataService.userProposalStats()
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
