import { Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { WishlistService } from './wishlist.service'
import { UserOwnershipGuard } from 'src/common/guards/ownership.guard'
import { WishlistResponseDto } from 'src/common/types/wishlisted-game.type'
import { VerifiedUserGuard } from 'src/common/guards/verified-user.guard'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) {}

    @Get(':accountId/:gameId')
    @ApiOperation({ summary: 'If the game is wishlisted by the account', deprecated: false })
    @ApiResponse({ status: 200, type: WishlistResponseDto })
    async isGameWishlisted(
        @Param('accountId', ParseIntPipe) accountId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ): Promise<WishlistResponseDto> {
        const isWishlisted = await this.wishlistService.isGameWishlisted(accountId, gameId)
        return { isWishlisted }
    }

    @UseGuards(UserOwnershipGuard)
    @Put(':accountId/:gameId')
    @ApiOperation({ summary: 'Toggle the wishlist status of the game', deprecated: false })
    @ApiResponse({ status: 200, type: WishlistResponseDto })
    async toggleWishlist(
        @Param('accountId', ParseIntPipe) accountId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ): Promise<WishlistResponseDto> {
        await this.wishlistService.toggleWishlist(accountId, gameId)
        const isWishlisted = await this.wishlistService.isGameWishlisted(accountId, gameId)
        return { isWishlisted }
    }
}
