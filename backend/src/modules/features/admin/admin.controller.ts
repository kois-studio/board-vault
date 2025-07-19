import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { AdminGuard } from '../../../common/guards/admin.guard'

import { AdminService } from './admin.service'
import { CreateTagCategoryDto, TagCategoryDto, TagCategoryWithTagsDto } from '../../../common/types/tag-category.type'
import { CreateTagDto, TagDto } from '../../../common/types/tag.type'
import { 
    UpdateGameTranslationsBody, 
    UpdateGameTagsBody, 
    AdminGamesResponseDto,
    ApproveGameProposalBody,
    RejectGameProposalBody,
    AdminGameProposalsResponseDto
} from '../../../common/types/admin.type'
import { GameWithTagsAndTranslationsDto } from '../../../common/types/game.type'
import { SuccessDto } from '../../../common/types/auth.type'
import { GameProposalCompleteDto } from '../../../common/types/game-proposal.type'

@UseGuards(JwtAuthGuard, VerifiedUserGuard, AdminGuard)
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    // #region Tag Categories

    @Get('/tag-categories')
    @ApiOperation({ summary: 'Get all tag categories', deprecated: false })
    @ApiResponse({ status: 200, type: [TagCategoryWithTagsDto], description: 'List of all tag categories' })
    async getTagCategories() {
        return this.adminService.getAdminTagCategories()
    }

    @Post('/tag-categories')
    @ApiOperation({ summary: 'Create a new tag category', deprecated: false })
    @ApiResponse({ status: 200, type: CreateTagCategoryDto, description: 'New tag category created' })
    async createTagCategory(@Body() tagCategoryDto: CreateTagCategoryDto) {
        return this.adminService.createTagCategory(tagCategoryDto.name)
    }

    @Put('/tag-categories/:id')
    @ApiOperation({ summary: 'Update a tag category', deprecated: false })
    @ApiResponse({ status: 200, type: CreateTagCategoryDto, description: 'Tag category updated' })
    async updateTagCategory(@Param('id') id: string, @Body() tagCategoryDto: CreateTagCategoryDto) {
        return this.adminService.updateTagCategory(Number(id), tagCategoryDto.name)
    }

    @Delete('/tag-categories/:id')
    @ApiOperation({ summary: 'Delete a tag category', deprecated: false })
    @ApiResponse({ status: 200, description: 'Tag category deleted' })
    async deleteTagCategory(@Param('id') id: string) {
        return this.adminService.deleteTagCategory(Number(id))
    }

    // #endregion

    // #region Tags

    @Get('/tags')
    @ApiOperation({ summary: 'Get all tags', deprecated: false })
    @ApiResponse({ status: 200, type: [TagDto], description: 'List of all tags' })
    async getTags() {
        return this.adminService.getAdminTags()
    }

    @Post('/tags')
    @ApiOperation({ summary: 'Create a new tag', deprecated: false })
    @ApiResponse({ status: 200, type: CreateTagDto, description: 'New tag created' })
    async createTag(@Body() tagDto: CreateTagDto) {
        return this.adminService.createTag(tagDto.name, tagDto.categoryId)
    }

    @Put('/tags/:id')
    @ApiOperation({ summary: 'Update a tag', deprecated: false })
    @ApiResponse({ status: 200, type: CreateTagDto, description: 'Tag updated' })
    async updateTag(@Param('id') id: string, @Body() tagDto: CreateTagDto) {
        return this.adminService.updateTag(Number(id), tagDto.name, tagDto.categoryId)
    }

    @Delete('/tags/:id')
    @ApiOperation({ summary: 'Delete a tag', deprecated: false })
    @ApiResponse({ status: 200, description: 'Tag deleted' })
    async deleteTag(@Param('id') id: string) {
        return this.adminService.deleteTag(Number(id))
    }

    // #endregion

    // #region Games

    @Get('/games')
    @ApiOperation({ summary: 'Get games with translations and tags (paginated and searchable)', deprecated: false })
    @ApiResponse({ 
        status: 200, 
        description: 'Paginated list of games with translations and tags',
        type: AdminGamesResponseDto
    })
    async getGames(
        @Query('search') search: string = '',
        @Query('page', ParseIntPipe) page: number = 1,
        @Query('limit', ParseIntPipe) limit: number = 10,
    ) {
        return this.adminService.getAdminGames(search, page, limit)
    }

    @Put('/games/:id/translations')
    @ApiOperation({ summary: 'Update game translations', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'Game translations updated' })
    async updateGameTranslations(@Param('id') id: string, @Body() translations: UpdateGameTranslationsBody) {
        return this.adminService.updateGameTranslations(Number(id), translations)
    }

    @Put('/games/:id/tags')
    @ApiOperation({ summary: 'Update game tags', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'Game tags updated' })
    async updateGameTags(@Param('id') id: string, @Body() payload: UpdateGameTagsBody) {
        return this.adminService.updateGameTags(Number(id), payload)
    }

    // #endregion

    // #region Game Proposals

    @Get('/proposals')
    @ApiOperation({ summary: 'Get game proposals (paginated and filterable by status)', deprecated: false })
    @ApiResponse({ 
        status: 200, 
        description: 'Paginated list of game proposals',
        type: AdminGameProposalsResponseDto
    })
    async getGameProposals(
        @Query('status') status?: 'pending' | 'approved' | 'rejected' | 'duplicate',
        @Query('page', ParseIntPipe) page: number = 1,
        @Query('limit', ParseIntPipe) limit: number = 10,
    ) {
        return this.adminService.getAdminGameProposals(status, page, limit)
    }

    @Get('/proposals/:id')
    @ApiOperation({ summary: 'Get a specific game proposal', deprecated: false })
    @ApiResponse({ 
        status: 200, 
        description: 'Game proposal details',
        type: GameProposalCompleteDto
    })
    async getGameProposal(@Param('id') id: string) {
        return this.adminService.getAdminGameProposalById(Number(id))
    }

    @Post('/proposals/:id/approve')
    @ApiOperation({ summary: 'Approve a game proposal and create the game', deprecated: false })
    @ApiResponse({ 
        status: 200, 
        description: 'Game proposal approved and game created',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                createdGameId: { type: 'number' }
            }
        }
    })
    async approveGameProposal(
        @Param('id') id: string,
        @Body() approvalData: ApproveGameProposalBody,
        // TODO: Get reviewerId from JWT token
        @Query('reviewerId', ParseIntPipe) reviewerId: number
    ) {
        return this.adminService.approveGameProposal(Number(id), reviewerId, approvalData)
    }

    @Post('/proposals/:id/reject')
    @ApiOperation({ summary: 'Reject a game proposal', deprecated: false })
    @ApiResponse({ 
        status: 200, 
        description: 'Game proposal rejected',
        type: SuccessDto
    })
    async rejectGameProposal(
        @Param('id') id: string,
        @Body() rejectionData: RejectGameProposalBody,
        // TODO: Get reviewerId from JWT token
        @Query('reviewerId', ParseIntPipe) reviewerId: number
    ) {
        return this.adminService.rejectGameProposal(Number(id), reviewerId, rejectionData)
    }

    @Post('/proposals/:id/duplicate')
    @ApiOperation({ summary: 'Mark a game proposal as duplicate', deprecated: false })
    @ApiResponse({ 
        status: 200, 
        description: 'Game proposal marked as duplicate',
        type: SuccessDto
    })
    async markGameProposalAsDuplicate(
        @Param('id') id: string,
        // TODO: Get reviewerId from JWT token
        @Query('reviewerId', ParseIntPipe) reviewerId: number,
        @Query('reviewNotes') reviewNotes?: string
    ) {
        return this.adminService.markGameProposalAsDuplicate(Number(id), reviewerId, reviewNotes)
    }

    @Delete('/proposals/:id')
    @ApiOperation({ summary: 'Delete a game proposal', deprecated: false })
    @ApiResponse({ 
        status: 200, 
        description: 'Game proposal deleted',
        type: SuccessDto
    })
    async deleteGameProposal(@Param('id') id: string) {
        return this.adminService.deleteGameProposal(Number(id))
    }

    // #endregion
}
