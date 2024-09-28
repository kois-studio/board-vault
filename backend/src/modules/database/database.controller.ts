import { Controller, Delete, Logger, Param } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'

import { DatabaseService } from './database.service'

@ApiTags('database')
@Controller('database')
export class DatabaseController {
    private readonly logger: Logger

    constructor(private readonly databaseService: DatabaseService) {
        this.logger = new Logger(this.constructor.name)
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
    async reset() {
        // return this.databaseService.deleteAll()
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
    async delete(@Param('key') key: string) {
        console.log('key', key)
        // return this.databaseService.deleteOne(key)
    }
}
