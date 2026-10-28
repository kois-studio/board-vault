import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger'
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator'

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
    @MaxLength(1000)
    purchaseNotes: string | null

    @ApiProperty({
        example: 7,
        nullable: true,
        description: 'The edition of the game this copy is (ADR-0025), or null when the owner has not said.',
    })
    editionId: number | null
}

export class UpdateGameOwnedDto extends PartialType(OmitType(GameOwnedDto, ['accountId', 'gameId', 'editionId'])) {}

export class AddGameToCollectionBody {
    @ApiPropertyOptional({
        example: 7,
        description:
            'The edition of the game the person owns. It must be an edition of that game. Leave out when the game has one edition or the person does not say.',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    editionId?: number
}

export class SetOwnedEditionBody {
    @ApiProperty({ example: 7, nullable: true, description: 'The edition this copy is, or null for "not said".' })
    @ValidateIf((_, value) => value !== null)
    @IsInt()
    @Min(1)
    editionId: number | null
}
