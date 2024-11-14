import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MeetsService } from './meets.service'
import { MeetDto } from '../../common/types/meet.type'

@UseGuards(JwtAuthGuard)
@ApiTags('meets')
@ApiBearerAuth()
@Controller('meets')
export class MeetsController {
    constructor(private readonly meetsService: MeetsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all meets', deprecated: true })
    @ApiResponse({ status: 200, type: [MeetDto], description: 'List of all meets' })
    async getMeets() {
        return this.meetsService.getMeets()
    }

    @Get('/:meetId')
    @ApiOperation({ summary: 'Get meet by id', deprecated: true })
    @ApiResponse({ status: 200, type: MeetDto, description: 'Meet found' })
    @ApiResponse({ status: 404, description: 'Meet not found' })
    getMeetById(@Param('meetId', ParseIntPipe) meetId: number) {
        return this.meetsService.getMeetById(meetId)
    }
}
