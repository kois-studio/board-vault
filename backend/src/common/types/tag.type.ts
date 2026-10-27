import { ApiProperty, OmitType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'

import type { Locale } from '../i18n/locale.js'

/** A tag's or category's name in the languages other than English (ADR-0024); English is `name`. */
export type NameTranslations = Partial<Record<Exclude<Locale, 'en'>, string>>

/**
 * Names in the other interface languages. In a response, only the languages that have one.
 * In a request, a language left out stays as it is, and an empty string removes it.
 */
export class NameTranslationsDto implements NameTranslations {
    @ApiProperty({ required: false, example: 'Cooperativo' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    es?: string

    @ApiProperty({ required: false, example: 'Coopératif' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    fr?: string

    @ApiProperty({ required: false, example: 'Kooperativ' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    de?: string

    @ApiProperty({ required: false, example: 'Cooperativo' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    it?: string
}

/**
 * Tag with its category
 */
export class TagDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    id: number

    @ApiProperty({ example: 'Tag Name' })
    @IsString()
    @MaxLength(100)
    name: string

    @ApiProperty({ example: 1 })
    @IsNumber()
    categoryId: number

    @ApiProperty({ example: 10 })
    @IsNumber()
    gameCount?: number

    @ApiProperty({ type: NameTranslationsDto, required: false, description: 'The name in the other interface languages' })
    @IsOptional()
    @ValidateNested()
    @Type(() => NameTranslationsDto)
    translations?: NameTranslationsDto
}

/** What Administration sends to create or rename a tag; the game count is the API's to say. */
export class CreateTagDto extends OmitType(TagDto, ['id', 'gameCount']) {}

/**
 * Tag with its category information for admin game views
 */
export class GameTagWithCategoryDto {
    @ApiProperty({ example: 1, description: 'Tag ID' })
    id: number

    @ApiProperty({ example: 'Strategy', description: "Tag name, in the reader's language where it has one (admin game lists: English)" })
    name: string

    @ApiProperty({
        example: 'Game Type',
        description: "Category name, in the reader's language where it has one (admin game lists: English)",
    })
    categoryName: string
}

/** A tag that at least one catalogue game has, for the Browse filters. */
export class CatalogueTagDto extends GameTagWithCategoryDto {
    @ApiProperty({ example: 12, description: 'Games in the catalogue with this tag' })
    gameCount: number
}
