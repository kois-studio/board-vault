import { ApiProperty } from '@nestjs/swagger'

export class MeetDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 12345 })
    groupId: number

    @ApiProperty({ example: 12345 })
    createdBy: number

    @ApiProperty({ example: '2024-09-28 10:02:39' })
    createdAt: string

    @ApiProperty({ example: true })
    isConfirmed: boolean

    @ApiProperty({ example: '2024-09-28 10:02:39' })
    confirmedAt: string | null
}
