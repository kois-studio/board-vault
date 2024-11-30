import { ApiProperty, PartialType, PickType } from '@nestjs/swagger'

export class MeetGameDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Meeting.' })
    meetId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Group.' })
    gameId: number

    @ApiProperty({ example: true })
    isPlayed: boolean
}

export class UpdateMeetGameBody extends PartialType(PickType(MeetGameDto, ['isPlayed'])) {}
