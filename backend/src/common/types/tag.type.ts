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
}

export class CreateTagDto extends OmitType(TagDto, ['id']) {}
