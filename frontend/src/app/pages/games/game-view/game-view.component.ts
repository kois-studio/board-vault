import { CommonModule } from '@angular/common'
import { Component, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { Api } from '../../../api/api'
import type { GameViewType } from '../../../api/api.types'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [CommonModule, FormsModule, RouterLink, ContainerWrapperComponent],
    templateUrl: './game-view.component.html',
})
export class GameViewPageComponent {
    private readonly dataService = inject(DataService)
    private readonly route = inject(ActivatedRoute)
    private readonly api = inject(Api)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGames$ = this.dataService.userGames

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isLoading = false
    public gameView$ = signal<GameViewType | null>(null)

    // TODO: delete this
    averageRating = 7.5
    isOwned = false
    isWishlisted = false
    tags = ['tag1', 'tag2', 'tag3']
    description = 'This is a description of the game'
    purchaseDate = new Date()
    purchasePrice = 100
    purchaseNotes = 'This is a note about the game'
    playHistory = [
        {
            playDate: new Date(),
            playNotes: 'This is a note about the play',
            date: new Date(),
            group: 'Group 1',
            players: [
                {
                    name: 'Player 1',
                    avatar: 'https://via.placeholder.com/150',
                },
            ],
        },
    ]
    userRating = 5
    similarGames = [
        {
            id: 1,
            title: 'Game 1',
            imageUrl: 'https://via.placeholder.com/150',
            rating: 7.5,
            minPlayers: 1,
            maxPlayers: 4,
        },
    ]

    constructor() {
        effect(() => {
            const gameId = Number.parseInt(this.route.snapshot.paramMap.get('gameId') || '')

            if (Number.isNaN(gameId) || !this.currentUser$()) {
                return
            }

            // this.api.getGame(gameId).subscribe({
            //     next: (game) => {
            //         this.gameData$.set(game)
            //     },
            //     error: (error) => {
            //         console.error(error)
            //     },
            // })
        })
    }

    shareGame() {}
    addToCollection() {}
    toggleWishlist() {}
    saveOwnedGameDetails() {}
    removeFromCollection() {}
    rateGame(rating: number) {}
}
