import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { AdminGuard } from '../../../common/guards/admin.guard'

import { AdminService } from './admin.service'
import { CreateTagCategoryDto, TagCategoryDto, TagCategoryWithTagsDto } from '../../../common/types/tag-category.type'
import { TagDto } from 'src/common/types/tag.type'

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
        // TODO: Implement this
        // return this.adminService.createTagCategory(tagCategoryDto)
    }

    @Put('/tag-categories/:id')
    @ApiOperation({ summary: 'Update a tag category', deprecated: false })
    @ApiResponse({ status: 200, type: CreateTagCategoryDto, description: 'Tag category updated' })
    async updateTagCategory(@Param('id') id: string, @Body() tagCategoryDto: CreateTagCategoryDto) {
        // TODO: Implement this
        // return this.adminService.updateTagCategory(id, tagCategoryDto)
    }

    // #endregion

    // #region Tags

    @Get('/tags')
    @ApiOperation({ summary: 'Get all tags', deprecated: false })
    @ApiResponse({ status: 200, type: [TagDto], description: 'List of all tags' })
    async getTags() {
        // TODO: Implement this
        // return this.adminService.getAdminTags()
    }

    @Post('/tags')
    @ApiOperation({ summary: 'Create a new tag', deprecated: false })
    @ApiResponse({ status: 200, type: TagDto, description: 'New tag created' })
    async createTag(@Body() tagDto: TagDto) {
        // TODO: Implement this
        // return this.adminService.createTag(tagDto)
    }

    @Put('/tags/:id')
    @ApiOperation({ summary: 'Update a tag', deprecated: false })
    @ApiResponse({ status: 200, type: TagDto, description: 'Tag updated' })
    async updateTag(@Param('id') id: string, @Body() tagDto: TagDto) {
        // TODO: Implement this
        // return this.adminService.updateTag(id, tagDto)
    }

    // #endregion
}
