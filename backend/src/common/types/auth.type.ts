import { ApiProperty } from '@nestjs/swagger'

export class SuccessDto {
    @ApiProperty({ example: true, description: 'The success status of the operation.' })
    success: boolean
}

export class AccessTokenDto {
    @ApiProperty({ example: 'eyJhbGcifasdjghnsndgi...', description: 'The JWT access token.' })
    accessToken: string
}
