import { ApiProperty } from '@nestjs/swagger'
import { IsInt, Min } from 'class-validator'

import { GameCompleteDto } from './game.type'
import { UserPublicDto } from './user.type'

export class GroupGameInterestBody {
    @ApiProperty({ example: 42, description: 'Catalog game the member wants the group to consider acquiring.' })
    @IsInt()
    @Min(1)
    gameId: number
}

export class GroupAcquisitionEntryDto {
    @ApiProperty({ type: GameCompleteDto })
    gameData: GameCompleteDto

    @ApiProperty({ type: [UserPublicDto] })
    interestedBy: Array<UserPublicDto>

    @ApiProperty({ example: 2 })
    interestCount: number

    @ApiProperty({ example: 0 })
    ownerCount: number

    @ApiProperty({ example: '2026-09-03 20:00:00' })
    firstInterestedAt: string
}
