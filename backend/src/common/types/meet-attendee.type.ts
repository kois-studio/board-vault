import { ApiProperty, PartialType, PickType } from '@nestjs/swagger'

export class MeetAttendeeDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Meeting.' })
    meetId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Group.' })
    accountId: number

    @ApiProperty({ example: true })
    isAttending: boolean
}

export class UpdateMeetAttendeeBody extends PartialType(PickType(MeetAttendeeDto, ['isAttending'])) {}
