import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router } from '@angular/router'
import { FormGameSubmissionComponent } from '../../../components/forms/form-game-submission/form-game-submission.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'

@Component({
    imports: [FormGameSubmissionComponent, ContainerWrapperComponent, PageHeaderComponent, ButtonComponent, IconComponent],
    templateUrl: 'propose-game-page.component.html',
})
export class ProposeGamePageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute)
    private readonly router = inject(Router)
    private readonly destroyRef = inject(DestroyRef)

    public readonly initialTitle = signal<string | undefined>(undefined)
    public isSubmitted = signal(false)

    ngOnInit() {
        // Get title from query params
        this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            this.initialTitle.set(params['title'] || undefined)
        })
    }

    public onProposalSubmitted() {
        // Show success message instead of navigating away
        this.isSubmitted.set(true)
    }

    public navigateBack() {
        this.router.navigate(['/collection'])
    }
}
