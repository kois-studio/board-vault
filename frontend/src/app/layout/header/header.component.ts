import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageSelectorComponent } from "../../components/language-selector/language-selector.component";

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, LanguageSelectorComponent],
})
export class LayoutHeaderComponent implements OnInit {
    public currentLocale = 'en';
    public styles = {
        link: 'b-0 cursor-pointer p-2 text-xl font-bold tracking-wider hover:text-green-600',
    };
    public isSessionValid = false;

    ngOnInit() {}
}
