import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CollectionService } from './collection.service'
import { GameDto } from '../../../common/types/game.type'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { GameReviewDto } from '../../../common/types/game-review.type'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@ApiTags('collection')
@ApiBearerAuth()
@Controller('collection')
export class CollectionController {
    constructor(private readonly collectionService: CollectionService) {}

    @Get('/user/:userId/games')
    @ApiOperation({ summary: 'Get all games owned by a user', deprecated: false })
    @ApiResponse({ status: 200, type: [GameDto], description: 'List of all games owned by the user' })
    async getGamesOwnedByUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.collectionService.getGamesOwnedByUser(userId)
    }
}
