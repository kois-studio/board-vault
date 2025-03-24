import { ApiProperty } from '@nestjs/swagger'

export class UserStatsDto {
    @ApiProperty({
        description: 'Total value of all games',
        example: 1000,
    })
    totalGamesValue: number
}
