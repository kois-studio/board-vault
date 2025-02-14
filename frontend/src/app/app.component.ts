import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ToastComponent } from './components/toast/toast.component'

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToastComponent],
    templateUrl: './app.component.html',
})
export class AppComponent {}
