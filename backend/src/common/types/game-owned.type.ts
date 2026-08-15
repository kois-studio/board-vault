import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger'
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'

// base GameOwned as it comes from db
export class GameOwnedDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account.' })
    @IsInt()
    @Min(1)
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Game.' })
    @IsInt()
    @Min(1)
    gameId: number

    @ApiProperty({ example: 12345, description: 'The price of the game when purchased.' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    purchasePrice: number | null

    @ApiProperty({ example: '2021-01-01', description: 'The date the game was purchased.' })
    @IsOptional()
    @IsDateString()
    purchaseDate: string | null

    @ApiProperty({ example: 'I got this as a gift from my friend.', description: 'Any notes about the purchase.' })
    @IsOptional()
    @IsString()
    purchaseNotes: string | null
}

export class UpdateGameOwnedDto extends PartialType(OmitType(GameOwnedDto, ['accountId', 'gameId'])) {}
