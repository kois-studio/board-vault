import { ApiProperty } from '@nestjs/swagger'

/**
 * Tag category
 */
export class TagCategoryDto {
    @ApiProperty({ example: 1 })
    id: number

    @ApiProperty({ example: 'Action' })
    name: string
}
