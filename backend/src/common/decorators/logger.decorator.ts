import { Logger } from "@nestjs/common"

export function LogFeature(logger: Logger) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value

        descriptor.value = async function (...args: any[]) {
            logger.verbose(`[FEATURE] IN ${propertyKey}`)
            const result = await originalMethod.apply(this, args)
            logger.verbose(`[FEATURE] OUT ${propertyKey}`)
            return result
        }

        return descriptor
    }
}
