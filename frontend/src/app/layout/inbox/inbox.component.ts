import { Component, computed, DestroyRef, DOCUMENT, ElementRef, effect, inject, NgZone, signal, untracked, viewChild } from '@angular/core'
import { CardInvitationComponent } from '../../components/card-invitation/card-invitation.component'
import { CardNotificationComponent } from '../../components/card-notification/card-notification.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { intlLocale } from '../../core/i18n/format'
import { SortByDatePipe } from '../../core/pipes/sortByDate.pipe'
import { DataService } from '../../core/services/data.service'
import { injectDisclosure } from '../../core/utils/disclosure'

/** How often the inbox looks again while the page is in view. */
export const INBOX_CHECK_MS = 60_000

/** Read to screen readers when something new arrives in the inbox. */
function inboxAnnouncement(count: number): string {
    return new Intl.PluralRules(intlLocale()).select(count) === 'one'
        ? $localize`:inbox arrival, one|Read to screen readers when the inbox has new things, one:Inbox: ${count}:count: new`
        : $localize`:inbox arrival, other|Read to screen readers when the inbox has new things, more than one:Inbox: ${count}:count: new`
}

/** The inbox button's name while something is new. */
function inboxLabel(count: number): string {
    return new Intl.PluralRules(intlLocale()).select(count) === 'one'
        ? $localize`:inbox button, one|Name of the inbox button in the header with new things, one:Inbox, ${count}:count: new`
        : $localize`:inbox button, other|Name of the inbox button in the header with new things, more than one:Inbox, ${count}:count: new`
}

/** The bell in the header: pending group invitations and notifications, with one count. */
@Component({
    selector: 'app-inbox',
    imports: [ButtonComponent, CardInvitationComponent, CardNotificationComponent, IconComponent, SortByDatePipe],
    templateUrl: './inbox.component.html',
})
export class InboxComponent {
    private readonly dataService = inject(DataService)
    private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger')

    public readonly disclosure = injectDisclosure(() => this.trigger())

    public readonly invitations = this.dataService.userInvitations
    public readonly invitationsLoading = this.dataService.userInvitationsLoading
    public readonly invitationsError = this.dataService.userInvitationsError
    public readonly notifications = this.dataService.userNotifications
    public readonly notificationsLoading = this.dataService.userNotificationsLoading
    public readonly notificationsError = this.dataService.userNotificationsError

    public readonly unreadCount = computed(() => this.notifications().filter((notification) => !notification.isRead).length)
    public readonly count = computed(() => this.invitations().length + this.unreadCount())
    constructor() {
        // Notifications come from other people's actions, so look again when the app comes back into view.
        const document = inject(DOCUMENT)
        const onVisible = () => {
            if (document.visibilityState === 'visible') this.dataService.refreshSharedActivity()
        }
        document.addEventListener('visibilitychange', onVisible)
        // While the page is in view, new notifications show up without opening the inbox. Outside Angular's
        // zone, so a page never waits on it to be stable; the signals it sets still update the view.
        const check = inject(NgZone).runOutsideAngular(() =>
            setInterval(() => {
                if (document.visibilityState === 'visible') this.dataService.refreshInbox()
            }, INBOX_CHECK_MS),
        )
        inject(DestroyRef).onDestroy(() => {
            document.removeEventListener('visibilitychange', onVisible)
            clearInterval(check)
        })

        // Tells screen readers when a look at the inbox brings something new; the badge itself is hidden
        // from them. Only refreshInbox counts arrivals, so loading the inbox the first time never does.
        effect(() => {
            if (this.dataService.inboxArrivals() === 0) return
            untracked(() => {
                const count = this.count()
                this.announcement.set(inboxAnnouncement(count))
            })
        })
    }

    /** Read by screen readers when the count of new things goes up. */
    public readonly announcement = signal('')

    /** Opening always looks again, so what arrived a moment ago is there. */
    public toggle(): void {
        if (!this.disclosure.isOpen()) this.dataService.refreshInbox()
        this.disclosure.toggle()
    }

    public readonly triggerLabel = computed(() => {
        const count = this.count()
        return count ? inboxLabel(count) : $localize`:Name of the inbox button in the header when nothing is new:Inbox`
    })

    public markAllRead(): void {
        this.dataService.markAllNotificationsRead()
    }

    public retryInvitations(): void {
        this.dataService.retryUserInvitations()
    }

    public retryNotifications(): void {
        this.dataService.retryUserNotifications()
    }
}
