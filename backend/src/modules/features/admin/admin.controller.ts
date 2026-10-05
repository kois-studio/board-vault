import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AdminGuard } from '../../../common/guards/admin.guard.js'
import { AuthGuard } from '../../../common/guards/auth.guard.js'
import {
    UpdateGameTranslationsBody,
    UpdateGameTagsBody,
    AdminGamesResponseDto,
    ApproveGameProposalBody,
    RejectGameProposalBody,
    AdminGameProposalsResponseDto,
    AdminGamesQuery,
    AdminProposalsQuery,
    DuplicateGameProposalBody,
} from '../../../common/types/admin.type.js'
import { SuccessDto } from '../../../common/types/auth.type.js'
import { GameProposalCompleteDto } from '../../../common/types/game-proposal.type.js'
import { CreateTagCategoryDto, TagCategoryWithTagsDto } from '../../../common/types/tag-category.type.js'
import { CreateTagDto, TagDto } from '../../../common/types/tag.type.js'

import { AdminService } from './admin.service.js'

@UseGuards(AuthGuard, AdminGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
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
    @ApiResponse({ status: 200, type: TagCategoryWithTagsDto, description: 'New tag category created' })
    async createTagCategory(@Body() tagCategoryDto: CreateTagCategoryDto) {
        return this.adminService.createTagCategory(tagCategoryDto.name)
    }

    @Put('/tag-categories/:id')
    @ApiOperation({ summary: 'Update a tag category', deprecated: false })
    @ApiResponse({ status: 200, type: TagCategoryWithTagsDto, description: 'Tag category updated' })
    async updateTagCategory(@Param('id', ParseIntPipe) id: number, @Body() tagCategoryDto: CreateTagCategoryDto) {
        return this.adminService.updateTagCategory(id, tagCategoryDto.name)
    }

    @Delete('/tag-categories/:id')
    @ApiOperation({ summary: 'Delete a tag category', deprecated: false })
    @ApiResponse({ status: 200, description: 'Tag category deleted' })
    async deleteTagCategory(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.deleteTagCategory(id)
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
    async updateTag(@Param('id', ParseIntPipe) id: number, @Body() tagDto: CreateTagDto) {
        return this.adminService.updateTag(id, tagDto.name, tagDto.categoryId)
    }

    @Delete('/tags/:id')
    @ApiOperation({ summary: 'Delete a tag', deprecated: false })
    @ApiResponse({ status: 200, description: 'Tag deleted' })
    async deleteTag(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.deleteTag(id)
    }

    // #endregion

    // #region Games

    @Get('/games')
    @ApiOperation({ summary: 'Get games with translations and tags (paginated and searchable)', deprecated: false })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of games with translations and tags',
        type: AdminGamesResponseDto,
    })
    async getGames(@Query() query: AdminGamesQuery) {
        return this.adminService.getAdminGames(query.search ?? '', query.page, query.limit)
    }

    @Put('/games/:id/translations')
    @ApiOperation({ summary: 'Update game translations', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'Game translations updated' })
    async updateGameTranslations(@Param('id', ParseIntPipe) id: number, @Body() translations: UpdateGameTranslationsBody) {
        return this.adminService.updateGameTranslations(id, translations)
    }

    @Put('/games/:id/tags')
    @ApiOperation({ summary: 'Update game tags', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'Game tags updated' })
    async updateGameTags(@Param('id', ParseIntPipe) id: number, @Body() payload: UpdateGameTagsBody) {
        return this.adminService.updateGameTags(id, payload)
    }

    // #endregion

    // #region Game Proposals

    @Get('/proposals')
    @ApiOperation({ summary: 'Get game proposals (paginated and filterable by status)', deprecated: false })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of game proposals',
        type: AdminGameProposalsResponseDto,
    })
    async getGameProposals(@Query() query: AdminProposalsQuery) {
        return this.adminService.getAdminGameProposals(query.status, query.page, query.limit)
    }

    @Get('/proposals/:id')
    @ApiOperation({ summary: 'Get a specific game proposal', deprecated: false })
    @ApiResponse({
        status: 200,
        description: 'Game proposal details',
        type: GameProposalCompleteDto,
    })
    async getGameProposal(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.getAdminGameProposalById(id)
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
                createdGameId: { type: 'number' },
            },
        },
    })
    async approveGameProposal(
        @Req() request: { user: { userId: number } },
        @Param('id', ParseIntPipe) id: number,
        @Body() approvalData: ApproveGameProposalBody,
    ) {
        return this.adminService.approveGameProposal(id, request.user.userId, approvalData)
    }

    @Post('/proposals/:id/reject')
    @ApiOperation({ summary: 'Reject a game proposal', deprecated: false })
    @ApiResponse({
        status: 200,
        description: 'Game proposal rejected',
        type: SuccessDto,
    })
    async rejectGameProposal(
        @Req() request: { user: { userId: number } },
        @Param('id', ParseIntPipe) id: number,
        @Body() rejectionData: RejectGameProposalBody,
    ) {
        return this.adminService.rejectGameProposal(id, request.user.userId, rejectionData)
    }

    @Post('/proposals/:id/duplicate')
    @ApiOperation({ summary: 'Mark a game proposal as duplicate', deprecated: false })
    @ApiResponse({
        status: 200,
        description: 'Game proposal marked as duplicate',
        type: SuccessDto,
    })
    async markGameProposalAsDuplicate(
        @Req() request: { user: { userId: number } },
        @Param('id', ParseIntPipe) id: number,
        @Body() body: DuplicateGameProposalBody,
    ) {
        return this.adminService.markGameProposalAsDuplicate(id, request.user.userId, body)
    }

    @Delete('/proposals/:id')
    @ApiOperation({ summary: 'Delete a game proposal', deprecated: false })
    @ApiResponse({
        status: 200,
        description: 'Game proposal deleted',
        type: SuccessDto,
    })
    async deleteGameProposal(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.deleteGameProposal(id)
    }

    // #endregion
}
