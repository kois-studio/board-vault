import { ApiProperty } from '@nestjs/swagger'
import { SupportedLanguage } from './game-translation.type'

export class UpdateGameTranslationsBody {
    @ApiProperty({ 
        description: 'English translation of the game title',
        example: 'Catan',
        required: false
    })
    en?: string

    @ApiProperty({ 
        description: 'Spanish translation of the game title',
        example: 'Catan',
        required: false
    })
    es?: string
}

export class UpdateGameTagsBody {
    @ApiProperty({ 
        description: 'Array of tag IDs to assign to the game',
        example: [1, 2, 3],
        type: [Number]
    })
    tagIds: number[]
} 
