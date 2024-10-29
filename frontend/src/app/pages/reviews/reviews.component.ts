import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { GameType, UserType } from '../../api/api.types';
import { DataService } from '../../core/services/data.service';

@Component({
    standalone: true,
    imports: [CommonModule],
    templateUrl: 'reviews.component.html',
})
export class ReviewComponent {
    // From dataService
    public userReviews: ReturnType<typeof this.dataService.userReviews> = [];
    public userData: UserType | null = null;

    // Component props
    public allGroupGames: Record<GameType['id'], GameType> = {};
    public hoverRating: Record<GameType['id'], number> = {};

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.userReviews = this.dataService.userReviews();
            this.userData = this.dataService.currentUser();

            // from each group, get all the games
            const userGroups = this.dataService.userGroups()
            for (const group of userGroups) {
                for (const member of group.members) {
                    for (const game of member.games) {
                        this.allGroupGames[game.id] = game;
                    }
                    
                }
            }
        });
    }

    get gamesList() {
        return Object.values(this.allGroupGames);
    }

    public getReview(gameId: number): number {
        return this.userReviews.find((review) => review.gameId === gameId)?.review ?? -1;
    }

    public setReview(gameId: number, reviewValue: number) {
        const accountId = this.userData?.id;
        if (accountId) {
            if (this.getReview(gameId) === -1) {
                this.dataService.createGameReview(accountId, gameId, reviewValue);
            } else {
                this.dataService.updateGameReview(accountId, gameId, reviewValue);
            }
        }
    }

    public deleteReview(gameId: number) {
        const accountId = this.userData?.id;
        if (accountId) {
            this.dataService.deleteGameReview(accountId, gameId);
        }
    }
}
