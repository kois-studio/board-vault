import { ApiProperty, OmitType } from '@nestjs/swagger'

// Base Invitation as it comes from the database
export class InvitationDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the game.' })
    id: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the group to join.' })
    groupId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account of origin.' })
    fromAccountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account of destiny.' })
    toAccountId: number

    @ApiProperty({ example: 'pending', description: 'The status of the invitation.' })
    status: string // enum: ['pending', 'accepted', 'rejected']

    @ApiProperty({ example: '2021-10-10T12:00:00Z', description: 'The date the invitation was sent.' })
    sentAt: string
}

// POST requests --> no db generated props
export class CreateInvitationBody extends OmitType(InvitationDto, ['id', 'sentAt']) {}
