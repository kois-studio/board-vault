import { Controller, Delete, Get, Logger, Param } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { PrintKeysDto } from '../../../common/types/cache.type'
import { CacheService } from './cache.service'

@ApiTags('cache')
@Controller('cache')
export class CacheController {
    private readonly logger: Logger

    constructor(private readonly cacheService: CacheService) {
        this.logger = new Logger(this.constructor.name)
    }

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
    async delete(@Param('key') key: string): Promise<boolean> {
        return this.cacheService.deleteOne(key)
    }
}
