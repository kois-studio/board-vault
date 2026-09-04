import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app.module'
import { ApiErrorFilter } from './common/http/api-error.filter'
import { getCorsOrigins } from './common/http/cors'
import { applySecurityHeaders, createBodyParsers } from './common/http/http-hardening'
import { validateEnv } from './common/validators'

const port = process.env.PORT || 3000
const logger = new Logger('Init')

async function bootstrap() {
    validateEnv()

    // Is redis cache active?
    const configService = new ConfigService()
    const IS_REDIS_DISABLED = configService.get<string>('UPSTASH_REDIS_REST_DISABLE') === 'true'

    if (IS_REDIS_DISABLED) {
        logger.warn('Redis cache is disabled. The API will be slower.')
    } else {
        // await validateDatabase()
    }

    // Create the Nest application
    const app = await NestFactory.create(AppModule, { bodyParser: false })

    app.useGlobalFilters(new ApiErrorFilter())

    // Keep every DTO boundary strict, including routes added without a local pipe.
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    )

    // Keep request bodies bounded before they reach controllers or providers.
    app.use(...createBodyParsers())
    app.use(applySecurityHeaders)

    const corsOrigins = getCorsOrigins()

    app.enableCors({
        origin: corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type'],
        credentials: false,
        maxAge: 86400,
    })

    // Create the swagger documentation
    const swaggerConfig = new DocumentBuilder()
        .setTitle('BoardVault Swagger API')
        .setDescription('The deprecated endpoints are simply the ones that are not currently being used by frontend.')
        .setVersion('1.0')
        .addBearerAuth()
        .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)

    SwaggerModule.setup('swagger', app, document)
    logger.verbose(`NestJS is running on http://localhost:${port}`)
    logger.verbose(`Swagger running http://localhost:${port}/swagger`)

    // Start the application
    await app.listen(port)
}
bootstrap()
