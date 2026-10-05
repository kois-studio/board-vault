import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

import { GameCompleteDto } from './game.type.js'
import { UserPublicDto } from './user.type.js'

export class GroupGameInterestBody {
    @ApiProperty({ example: 42, description: 'Catalog game the member wants the group to consider acquiring.' })
    @IsInt()
    @Min(1)
    gameId: number
}

export type GroupAcquisitionDecisionStatus = 'open' | 'planned' | 'not_now'

export class UpdateGroupAcquisitionDecisionBody {
    @ApiProperty({ example: 'planned', enum: ['open', 'planned', 'not_now'] })
    @IsIn(['open', 'planned', 'not_now'])
    status: GroupAcquisitionDecisionStatus

    @ApiProperty({ example: 'Aim to buy before the autumn game nights.', required: false, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(280)
    note?: string | null
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

    @ApiProperty({ example: 'open', enum: ['open', 'planned', 'not_now'] })
    decisionStatus: GroupAcquisitionDecisionStatus

    @ApiProperty({ example: '2026-09-04 20:00:00', nullable: true })
    decisionAt: string | null

    @ApiProperty({ type: UserPublicDto, nullable: true })
    decisionBy: UserPublicDto | null
}
