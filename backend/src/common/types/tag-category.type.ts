import { ApiProperty, OmitType } from '@nestjs/swagger'
import { TagDto } from './tag.type'
import { IsNumber, IsString } from 'class-validator'

/**
 * Tag category
 */
export class TagCategoryDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    id: number

    @ApiProperty({ example: 'Action' })
    @IsString()
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

export class CreateTagCategoryDto extends OmitType(TagCategoryDto, ['id']) {}
