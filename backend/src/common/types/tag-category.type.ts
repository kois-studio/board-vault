import { ApiProperty } from '@nestjs/swagger'
import { TagDto } from './tag.type'

/**
 * Tag category
 */
export class TagCategoryDto {
    @ApiProperty({ example: 1 })
    id: number

    @ApiProperty({ example: 'Action' })
    name: string
}

/**
 * Tag category with tags and game count
 */
export class TagCategoryWithTagsDto extends TagCategoryDto {
    @ApiProperty({ type: [TagDto] })
    tags: TagDto[]

    @ApiProperty({ example: 10 })
    gameCount: number
}
