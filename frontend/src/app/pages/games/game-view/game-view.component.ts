import { CommonModule } from '@angular/common'
import { Component, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { Api } from '../../../api/api'
import type { GameViewType } from '../../../api/api.types'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { TagsComponent } from '../../../components/tags/tags.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { ImageBackgroundComponent } from '../../../components/ui/image-background/image-background.component'
import { ReviewDisplayComponent } from '../../../components/ui/review-display/review-display.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        ContainerWrapperComponent,
        ImageBackgroundComponent,
        ReviewDisplayComponent,
        TagsComponent,
        ButtonComponent,
        CardGameComponent,
    ],
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
    tags = [
        { tag: 'tag1', category: 'category1' },
        { tag: 'tag2', category: 'category2' },
        { tag: 'tag3', category: 'category3' },
    ]
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
                    avatar: 'https://th.bing.com/th/id/OIP.Nov0duOiE7Mh5CjeKhbGBgHaE8?w=244&h=180&c=7&r=0&o=5&pid=1.7',
                },
            ],
        },
    ]
    userRating = 5
    similarGames = [
        {
            id: 1,
            title: 'Game 1',
            imageUrl: 'https://th.bing.com/th/id/OIP.Nov0duOiE7Mh5CjeKhbGBgHaE8?w=244&h=180&c=7&r=0&o=5&pid=1.7',
            rating: 7.5,
            minPlayers: 1,
            maxPlayers: 4,
            gameAvgDuration: 120,
        },
    ]

    constructor() {
        effect(() => {
            const gameId = Number.parseInt(this.route.snapshot.paramMap.get('gameId') || '')
            const currentUser = this.currentUser$()

            if (Number.isNaN(gameId) || !currentUser) {
                return
            }

            this.api.getUserGame(currentUser.id, gameId).subscribe({
                next: (game) => {
                    this.gameView$.set(game)
                },
                error: (error) => {
                    console.error(error)
                },
            })
        })
    }

    shareGame() {}
    addToCollection() {}
    toggleWishlist() {
        this.isWishlisted = !this.isWishlisted
    }
    saveOwnedGameDetails() {}
    removeFromCollection() {}
    rateGame(rating: number) {}
}
