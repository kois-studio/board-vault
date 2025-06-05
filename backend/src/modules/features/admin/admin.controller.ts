import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { AdminGuard } from '../../../common/guards/admin.guard'

import { AdminService } from './admin.service'
import { TagCategoryDto, TagCategoryWithTagsDto } from '../../../common/types/tag-category.type'

@UseGuards(JwtAuthGuard, VerifiedUserGuard, AdminGuard)
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('/tag-categories')
    @ApiOperation({ summary: 'Get all tag categories', deprecated: false })
    @ApiResponse({ status: 200, type: [TagCategoryWithTagsDto], description: 'List of all tag categories' })
    async getTagCategories() {
        return this.adminService.getAdminTagCategories()
    }
}
