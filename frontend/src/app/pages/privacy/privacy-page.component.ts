import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CONTACT_EMAIL, contactMailto, DATA_CONTROLLER } from '../../core/contact'
import { formatDateTime } from '../../core/i18n/format'

/**
 * The public privacy notice (#153). Every statement has to match the code and the ADRs it names (0018, 0020,
 * 0021, 0023): change the page in the same pull request as the behaviour, and move the date.
 */
@Component({
    imports: [RouterLink],
    templateUrl: './privacy-page.component.html',
})
export class PrivacyPageComponent {
    protected readonly contactEmail = CONTACT_EMAIL
    protected readonly controllerName = DATA_CONTROLLER
    protected readonly contactLink = contactMailto(
        $localize`:Subject of the email a reader starts from the privacy page:About my data in Board Vault`,
    )
    protected readonly lastUpdated = formatDateTime(new Date(2026, 10, 10), { dateStyle: 'long' })
}
