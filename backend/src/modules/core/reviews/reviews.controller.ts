import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { SuccessDto } from '../../../common/types/auth.type'
import { ReviewsService } from './reviews.service'
import { CreateGameReviewBody, GameReviewDto } from '../../../common/types/game-review.type'

@UseGuards(JwtAuthGuard)
@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all Game Reviews', deprecated: true })
    @ApiResponse({ status: 200, type: [GameReviewDto], description: 'List of all Game Reviews' })
    async getGameReviews() {
        return this.reviewsService.getGameReviews()
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new game Review', deprecated: false })
    @ApiResponse({ status: 201, type: SuccessDto, description: 'The Game Review has been succesfully created' })
    async saveGameReview(@Body() gameReviewDto: CreateGameReviewBody) {
        return this.reviewsService.saveGameReview(gameReviewDto)
    }

    @Get('/:accountId/:gameId')
    @ApiOperation({ summary: 'Get gameReview by accountId and gameId', deprecated: true })
    @ApiResponse({ status: 200, type: GameReviewDto, description: 'Game Review found' })
    @ApiResponse({ status: 404, description: 'Game Review not found' })
    getGameReviewById(@Param('accountId', ParseIntPipe) accountId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.reviewsService.getGameReviewsById(accountId, gameId)
    }

    @Delete('/:accountId/:gameId')
    @ApiOperation({ summary: 'Delete a Game Review by Id', deprecated: true })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The Game Review has been succesfully deleted' })
    async deleteGameReviewById(@Param('accountId', ParseIntPipe) accountId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.reviewsService.deleteGameReviewById(accountId, gameId)
    }
}
