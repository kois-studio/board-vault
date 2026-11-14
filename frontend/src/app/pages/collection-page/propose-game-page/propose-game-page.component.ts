import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import {
    FormGameSubmissionComponent,
    type ProposalAddTo,
} from '../../../components/forms/form-game-submission/form-game-submission.component'
import { BackLinkComponent } from '../../../components/ui/back-link/back-link.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'

@Component({
    imports: [
        FormGameSubmissionComponent,
        ContainerWrapperComponent,
        PageHeaderComponent,
        BackLinkComponent,
        ButtonComponent,
        IconComponent,
        RouterLink,
    ],
    templateUrl: 'propose-game-page.component.html',
})
export class ProposeGamePageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute)
    private readonly destroyRef = inject(DestroyRef)

    public readonly initialTitle = signal<string | undefined>(undefined)
    public isSubmitted = signal(false)
    /** Where the approved game goes, so the thank-you says so. */
    public readonly addTo = signal<ProposalAddTo>('shelf')

    ngOnInit() {
        // Get title from query params
        this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            this.initialTitle.set(params['title'] || undefined)
        })
    }

    public onProposalSubmitted(addTo: ProposalAddTo) {
        // The page says thank you and what happens next, so the form sends no toast.
        this.addTo.set(addTo)
        this.isSubmitted.set(true)
    }
}
