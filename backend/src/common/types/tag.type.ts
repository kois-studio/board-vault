import { ApiProperty, OmitType } from '@nestjs/swagger'
import { IsNumber, IsString } from 'class-validator'

/**
 * Tag with its category
 */
export class TagDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    id: number

    @ApiProperty({ example: 'Tag Name' })
    @IsString()
    name: string

    @ApiProperty({ example: 1 })
    @IsNumber()
    categoryId: number

    @ApiProperty({ example: 10 })
    @IsNumber()
    gameCount?: number
}

export class CreateTagDto extends OmitType(TagDto, ['id']) {}

/**
 * Tag with its category information for admin game views
 */
export class GameTagWithCategoryDto {
    @ApiProperty({ example: 1, description: 'Tag ID' })
    id: number

    @ApiProperty({ example: 'Strategy', description: 'Tag name' })
    name: string

    @ApiProperty({ example: 'Game Type', description: 'Category name' })
    categoryName: string
}
