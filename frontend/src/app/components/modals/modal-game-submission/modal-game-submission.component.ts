import { Component, output, signal } from '@angular/core'
import { FormGameSubmissionComponent } from '../../forms/form-game-submission/form-game-submission.component'
import { ButtonComponent } from '../../ui/button/button.component'
import { DialogDirective } from '../../ui/dialog/dialog.directive'

@Component({
    imports: [ButtonComponent, DialogDirective, FormGameSubmissionComponent],
    selector: 'app-modal-game-submission',
    templateUrl: './modal-game-submission.component.html',
})
export class ModalGameSubmissionComponent {
    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isVisible = signal<boolean>(false)

    // --------------------------------------------------------------------------
    //        Events
    // --------------------------------------------------------------------------
    readonly proposalSubmitted = output<void>()

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public showDialog(): void {
        this.isVisible.set(true)
    }

    public hideDialog(): void {
        this.isVisible.set(false)
    }

    public onProposalSubmitted(): void {
        this.proposalSubmitted.emit()
        this.hideDialog()
    }
}
