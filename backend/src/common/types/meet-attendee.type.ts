import { ApiProperty } from '@nestjs/swagger'

export class MeetAttendeeDto {
    @ApiProperty({ example: 12345 })
    meetId: number

    @ApiProperty({ example: 12345 })
    accountId: number
}
