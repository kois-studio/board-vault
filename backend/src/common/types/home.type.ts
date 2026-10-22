import { ApiProperty } from '@nestjs/swagger'
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, Min } from 'class-validator'

export class HomePreferencesDto {
    @ApiProperty({ type: [Number], description: 'Pinned groups, in the account’s chosen order.' })
    @IsArray()
    @ArrayMaxSize(100)
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true })
    pinnedGroupIds: number[]

    @ApiProperty({ enum: ['recent', 'upcoming', 'name'] })
    @IsIn(['recent', 'upcoming', 'name'])
    groupOrder: 'recent' | 'upcoming' | 'name'

    @ApiProperty({ type: [Number], description: 'Personal rating reminders dismissed by this account, at most 100.' })
    @IsArray()
    @ArrayMaxSize(100)
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true })
    dismissedRatingGameIds: number[]
}
