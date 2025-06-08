import { ApiProperty } from '@nestjs/swagger'

/**
 * Tag with its category
 */
export class TagDto {
    @ApiProperty({ example: 1 })
    id: number

    @ApiProperty({ example: 'Tag Name' })
    name: string

    @ApiProperty({ example: 1 })
    categoryId: number
}
