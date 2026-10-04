import { Logger } from '@nestjs/common'

export function LogFeature(logger: Logger) {
    return function (_target: object, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value

        descriptor.value = async function (this: unknown, ...args: unknown[]) {
            logger.verbose(`[FEATURE] IN ${propertyKey}`)
            const result = await originalMethod.apply(this, args)

            logger.verbose(`[FEATURE] OUT ${propertyKey}`)
            return result
        }

        return descriptor
    }
}
