import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    ParseBoolPipe,
    DefaultValuePipe,
    Patch,
    Post,
    Query,
    Put,
    Req,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { GameCompleteDto } from '../../../common/types/game.type'
import {
    CreateGroupPersonBody,
    GroupPersonDto,
    GroupPersonGameOwnershipDto,
    GroupPersonGamePreferenceDto,
    GroupPeopleResponseDto,
    GroupPersonCatalogQuery,
    UpdateGroupPersonBody,
    UpdateGroupPersonOwnershipBody,
    UpdateGroupPersonPreferenceBody,
    ClaimGroupPersonBody,
} from '../../../common/types/group-person.type'

import { GroupPeopleService } from './group-people.service'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('group-people')
@ApiBearerAuth()
@Controller()
export class GroupPeopleController {
    constructor(private readonly groupPeopleService: GroupPeopleService) {}

    @Get('groups/:groupId/people')
    @ApiOperation({ summary: 'List active people represented in a group' })
    @ApiResponse({ status: 200, type: GroupPeopleResponseDto })
    async getPeople(
        @Req() request: { user: { userId: number } },
        @Param('groupId', ParseIntPipe) groupId: number,
        @Query('includeArchived', new DefaultValuePipe(false), ParseBoolPipe) includeArchived: boolean,
    ) {
        return { people: await this.groupPeopleService.getWorkspace(request.user.userId, groupId, includeArchived) }
    }

    @Get('groups/:groupId/people/catalog')
    @ApiOperation({ summary: 'List catalog games available for group-person assertions' })
    @ApiResponse({ status: 200, type: [GameCompleteDto] })
    async getCatalog(
        @Req() request: { user: { userId: number } },
        @Param('groupId', ParseIntPipe) groupId: number,
        @Query() query: GroupPersonCatalogQuery,
    ) {
        return this.groupPeopleService.getCatalog(request.user.userId, groupId, query.search)
    }

    @Post('groups/:groupId/people')
    @ApiOperation({ summary: 'Create a placeholder person in a group' })
    @ApiResponse({ status: 201, type: GroupPersonDto })
    createPerson(
        @Req() request: { user: { userId: number } },
        @Param('groupId', ParseIntPipe) groupId: number,
        @Body() body: CreateGroupPersonBody,
    ) {
        return this.groupPeopleService.create(request.user.userId, groupId, body)
    }

    @Patch('groups/:groupId/people/:personId')
    @ApiOperation({ summary: 'Update or archive a group person' })
    @ApiResponse({ status: 200, type: GroupPersonDto })
    updatePerson(
        @Req() request: { user: { userId: number } },
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('personId', ParseIntPipe) personId: number,
        @Body() body: UpdateGroupPersonBody,
    ) {
        return this.groupPeopleService.update(request.user.userId, groupId, personId, body)
    }

    @Post('groups/:groupId/people/:personId/claim')
    @ApiOperation({ summary: 'Claim a targeted placeholder as the authenticated account' })
    claimPerson(
        @Req() request: { user: { userId: number } },
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('personId', ParseIntPipe) personId: number,
        @Body() body: ClaimGroupPersonBody,
    ) {
        return this.groupPeopleService.claim(request.user.userId, groupId, personId, body)
    }

    @Post('groups/:groupId/people/join')
    @ApiOperation({ summary: 'Join a group as a new linked group person' })
    @ApiResponse({ status: 201, type: GroupPersonDto })
    joinAsNewPerson(@Req() request: { user: { userId: number } }, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupPeopleService.joinAsNewPerson(request.user.userId, groupId)
    }

    @Get('groups/:groupId/people/:personId/ownership')
    @ApiOperation({ summary: 'List group-person game ownership assertions' })
    @ApiResponse({ status: 200, type: [GroupPersonGameOwnershipDto] })
    getOwnership(
        @Req() request: { user: { userId: number } },
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('personId', ParseIntPipe) personId: number,
    ) {
        return this.groupPeopleService.getOwnership(request.user.userId, groupId, personId)
    }

    @Put('groups/:groupId/people/:personId/ownership')
    @ApiOperation({ summary: 'Set a group-person game ownership assertion' })
    @ApiResponse({ status: 200, description: 'Ownership assertion saved' })
    updateOwnership(
        @Req() request: { user: { userId: number } },
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('personId', ParseIntPipe) personId: number,
        @Body() body: UpdateGroupPersonOwnershipBody,
    ) {
        return this.groupPeopleService.updateOwnership(request.user.userId, groupId, personId, body)
    }

    @Get('groups/:groupId/people/:personId/preferences')
    @ApiOperation({ summary: 'List group-person game preferences' })
    @ApiResponse({ status: 200, type: [GroupPersonGamePreferenceDto] })
    getPreferences(
        @Req() request: { user: { userId: number } },
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('personId', ParseIntPipe) personId: number,
    ) {
        return this.groupPeopleService.getPreferences(request.user.userId, groupId, personId)
    }

    @Put('groups/:groupId/people/:personId/preferences')
    @ApiOperation({ summary: 'Set a group-person game preference' })
    @ApiResponse({ status: 200, description: 'Preference saved' })
    updatePreference(
        @Req() request: { user: { userId: number } },
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('personId', ParseIntPipe) personId: number,
        @Body() body: UpdateGroupPersonPreferenceBody,
    ) {
        return this.groupPeopleService.updatePreference(request.user.userId, groupId, personId, body)
    }

    @Delete('groups/:groupId/people/:personId/preferences/:gameId')
    @ApiOperation({ summary: 'Remove a group-person game preference' })
    @ApiResponse({ status: 200, description: 'Preference removed' })
    deletePreference(
        @Req() request: { user: { userId: number } },
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('personId', ParseIntPipe) personId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ) {
        return this.groupPeopleService.deletePreference(request.user.userId, groupId, personId, gameId)
    }
}
