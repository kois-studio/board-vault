import { ApiProperty, OmitType } from '@nestjs/swagger'
import { IsNumber, IsString, MaxLength } from 'class-validator'

/**
 * Tag category
 */
export class TagCategoryDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    id: number

    @ApiProperty({ example: 'Action' })
    @IsString()
    @MaxLength(100)
    name: string
}

/**
 * Tag category with the ids of its tags and how many distinct games use them
 */
export class TagCategoryWithTagsDto extends TagCategoryDto {
    @ApiProperty({ type: [Number], example: [3, 7, 12], description: 'Ids of the tags in this category' })
    tags: number[]

    @ApiProperty({ example: 10, description: 'Distinct games with at least one tag in this category' })
    gameCount: number
}

export class CreateTagCategoryDto extends OmitType(TagCategoryDto, ['id']) {}
