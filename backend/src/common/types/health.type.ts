import { ApiProperty } from '@nestjs/swagger'

export class LivenessDto {
    @ApiProperty({ example: 'ok' })
    status: 'ok'
}

export class ReadinessChecksDto {
    @ApiProperty({ example: 'up', enum: ['up', 'down'] })
    database: 'up' | 'down'

    @ApiProperty({ example: 'up', enum: ['up', 'down', 'disabled'] })
    cache: 'up' | 'down' | 'disabled'

    @ApiProperty({ example: 'up', enum: ['up', 'down'] })
    schema: 'up' | 'down'
}

export class ReadinessDto {
    @ApiProperty({ example: 'ready', enum: ['ready', 'not_ready'] })
    status: 'ready' | 'not_ready'

    @ApiProperty({ type: ReadinessChecksDto })
    checks: ReadinessChecksDto
}
