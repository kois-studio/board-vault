import { ApiProperty } from '@nestjs/swagger'

export class UserStatsDto {
    @ApiProperty({
        description: 'Total value of all games',
        example: 1000,
    })
    totalGamesValue: number
}

export class UserProposalStatsDto {
    @ApiProperty({
        description: 'Total number of proposals submitted',
        example: 15,
    })
    totalProposals: number

    @ApiProperty({
        description: 'Number of approved proposals',
        example: 8,
    })
    approvedProposals: number

    @ApiProperty({
        description: 'Number of rejected proposals',
        example: 3,
    })
    rejectedProposals: number

    @ApiProperty({
        description: 'Number of proposals marked as duplicate',
        example: 2,
    })
    duplicateProposals: number

    @ApiProperty({
        description: 'Number of pending proposals',
        example: 2,
    })
    pendingProposals: number

    @ApiProperty({
        description: 'Approval rate percentage',
        example: 53.33,
    })
    approvalRate: number

    @ApiProperty({
        description: 'User reputation score (0-100)',
        example: 75,
    })
    reputationScore: number
}
