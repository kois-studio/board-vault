import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AdminGuard } from '../../../common/guards/admin.guard.js'
import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { CacheKeyParam, PrintKeysDto } from '../../../common/types/cache.type.js'

import { CacheService } from './cache.service.js'

@ApiTags('cache')
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller('cache')
export class CacheController {
    constructor(private readonly cacheService: CacheService) {}

    /**
     * ## Print all the database keys registered
     * @returns Response with the array of keys
     */
    @Get('/print')
    @ApiOperation({
        summary: 'Print all keys stored in the database',
    })
    @ApiResponse({
        status: 200,
        type: PrintKeysDto,
    })
    async printAll(): Promise<PrintKeysDto> {
        return this.cacheService.keys()
    }

    /**
     * ## Reset all database registers
     * @returns Confirmation that the database was deleted
     */
    @Delete('/reset')
    @ApiOperation({
        summary: 'Clear all data | try to avoid!',
        description: 'It flushes the whole Redis database, use it only if needed',
        deprecated: true,
    })
    @ApiResponse({
        status: 200,
        type: Boolean,
    })
    async reset(): Promise<boolean> {
        return this.cacheService.deleteAll()
    }

    /**
     * ## Reset all database registers
     * @returns Confirmation that the database was deleted
     */
    @Delete('/delete/:key')
    @ApiOperation({
        summary: 'Delete all data from a key',
    })
    @ApiResponse({
        status: 200,
        type: Boolean,
    })
    @ApiParam({
        name: 'key',
        type: String,
    })
    async delete(@Param() params: CacheKeyParam): Promise<boolean> {
        return this.cacheService.deleteOne(params.key)
    }
}
