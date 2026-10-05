import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { LivenessDto, ReadinessDto } from '../../../common/types/health.type.js'

import { HealthService } from './health.service.js'

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @ApiOperation({ summary: 'Check whether the API process is alive' })
    @ApiResponse({ status: 200, type: LivenessDto })
    getLiveness(): LivenessDto {
        return this.healthService.getLiveness()
    }

    @Get('ready')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Check whether the API dependencies are ready' })
    @ApiResponse({ status: 200, type: ReadinessDto })
    getReadiness(): Promise<ReadinessDto> {
        return this.healthService.getReadiness()
    }
}
