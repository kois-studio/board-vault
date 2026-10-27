import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'

import { NameTranslationsDto } from './tag.type.js'

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

    @ApiProperty({ type: NameTranslationsDto, required: false, description: 'The name in the other interface languages' })
    @IsOptional()
    @ValidateNested()
    @Type(() => NameTranslationsDto)
    translations?: NameTranslationsDto
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
