import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CacheKeyParam {
    @ApiProperty({ example: 'user-proposal-stats:1', description: 'The cache key to delete.' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(256)
    key: string
}

export class PrintKeysDto {
    @ApiProperty({
        description: 'Total number of records in the database',
        example: 42,
    })
    total: number

    @ApiProperty({
        description: 'Keys stored in the database',
        type: [String],
    })
    keys: string[]
}
