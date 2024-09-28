import { applyDecorators } from '@nestjs/common'
import { ApiParam } from '@nestjs/swagger'

export function ParamRiotId() {
    return applyDecorators(
        ApiParam({
            name: 'riotId',
            description: 'RiotID with format name#tag',
            type: String,
        }),
    )
}
