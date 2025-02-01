import { ApiProperty } from '@nestjs/swagger'

export class MeetGameDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Meeting.' })
    meetId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Group.' })
    gameId: number
}
