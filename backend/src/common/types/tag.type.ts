import { ApiProperty } from '@nestjs/swagger'

/**
 * Tag with its category
 */
export class TagDto {
    @ApiProperty({ example: 'Tag Name' })
    tag: string

    @ApiProperty({ example: 'Category Name' })
    category: string
}
