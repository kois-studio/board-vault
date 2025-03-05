import { ApiProperty } from '@nestjs/swagger'

export class MeetAccountGameDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account.' })
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Meeting.' })
    meetId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Group.' })
    gameId: number
}
