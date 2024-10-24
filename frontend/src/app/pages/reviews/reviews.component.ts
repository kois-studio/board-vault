import { CommonModule } from "@angular/common";
import { Component, effect } from "@angular/core";
import { Api } from "../../api/api";
import { DataService } from "../../core/services/data.service";
import { CardGameComponent } from "../../components/card-game/card-game.component";

@Component({
    standalone: true,
    imports: [CommonModule, CardGameComponent],
    templateUrl: 'reviews.component.html',
})
export class ReviewComponent {
    public userReviews: ReturnType<typeof this.dataService.userReviews> = []

    constructor(
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userReviews = this.dataService.userReviews()
        })
    }

}
