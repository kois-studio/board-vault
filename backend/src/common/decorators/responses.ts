import { applyDecorators, type Type } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'

export function ApiCustomResponse(type: Type<unknown> | [Type<unknown>]) {
    return applyDecorators(
        ApiResponse({
            status: 200,
            description: 'The summoner was found and the data is correct',
            type,
        }),
    )
}
