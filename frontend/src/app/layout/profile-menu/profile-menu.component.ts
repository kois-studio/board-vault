import { Component, computed, ElementRef, HostListener, inject, Renderer2, ViewChild } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { DataService } from '../../core/services/data.service'
import { LoginService } from '../../core/services/login.service'
import { ModalProfileInvitationsComponent } from './modals/modal-profile-invitations/modal-profile-invitations.component'
import { ModalProfileNotificationsComponent } from './modals/modal-profile-notifications/modal-profile-notifications.component'

@Component({
    imports: [ImageProfileComponent, IconComponent, ModalProfileInvitationsComponent, ModalProfileNotificationsComponent, RouterLink],
    selector: 'app-profile-menu',
    templateUrl: 'profile-menu.component.html',
})
export class ProfileMenuComponent {
    // --------------------------------------------------------------------------
    //        Services
    // --------------------------------------------------------------------------
    private readonly loginService = inject(LoginService)
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

    @ViewChild('profileTrigger') private profileTrigger?: ElementRef<HTMLButtonElement>

    // Method to toggle the dropdown
    toggleDropdown() {
        this.isDropdownVisible ? this.closeDropdown() : this.openDropdown()
    }

    private openDropdown(): void {
        this.isDropdownVisible = true

        this.clickListener = this.renderer.listen('document', 'click', (event: MouseEvent) => this.handleOutsideClick(event))
        setTimeout(() => (this.elementRef.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="menuitem"]')?.focus())
    }

    private closeDropdown(restoreFocus = true): void {
        this.isDropdownVisible = false
        this.removeClickListener()

        if (restoreFocus) {
            setTimeout(() => this.profileTrigger?.nativeElement.focus())
        }
    }

    // Handle clicking outside the dropdown
    handleOutsideClick(event: MouseEvent) {
        const clickedInside = this.elementRef.nativeElement.contains(event.target)
        if (!clickedInside) {
            this.closeDropdown(false)
        }
    }

    @HostListener('document:keydown.escape')
    public onEscape(): void {
        if (this.isDropdownVisible) {
            this.closeDropdown()
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
        this.closeDropdown(false)
    }

    public onClickInvitations() {
        this.modalProfileInvitationsComponent.showDialog()
        this.closeDropdown(false)
    }

    public onClickNotifications() {
        this.modalProfileNotificationsComponent.showDialog()
        this.closeDropdown(false)
    }

    public onClickSubmissions() {
        this.closeDropdown(false)
    }

    public async onClickSignOut(): Promise<void> {
        await this.loginService.logOut()
        this.dataService.currentUser.set(null)
    }

    // Clean up the listener when the component is destroyed
    ngOnDestroy() {
        this.removeClickListener()
    }
}
