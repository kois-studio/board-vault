import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { LayoutHeaderComponent } from './layout/header/header.component'
import { LayoutFooterComponent } from './layout/footer/footer.component'
import { ToastComponent } from './components/toast/toast.component'
import { ProfileComponent } from "./pages/profile/profile.component";

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, LayoutHeaderComponent, LayoutFooterComponent, ToastComponent, ProfileComponent],
    templateUrl: './app.component.html',
})
export class AppComponent {
  
}
