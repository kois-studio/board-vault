import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
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
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })

    // Vercel sits in front of the function and overwrites X-Forwarded-For with
    // the real client IP. Trust exactly that one hop so request.ip (used by
    // RateLimitGuard) is the client, not Vercel's internal address.
    if (process.env.VERCEL) {
        app.set('trust proxy', 1)
    }

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

    // Serve the interactive API docs outside production only. The committed
    // contract lives in docs/api/openapi.json.
    if (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production') {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('Board Vault API')
            .setDescription('Versioned contract snapshot for the Board Vault social group workspace API.')
            .setVersion('1.0')
            .addBearerAuth()
            .build()
        const document = SwaggerModule.createDocument(app, swaggerConfig)

        SwaggerModule.setup('swagger', app, document)
        logger.verbose(`Swagger running http://localhost:${port}/swagger`)
    }
    logger.verbose(`NestJS is running on http://localhost:${port}`)

    // Start the application
    await app.listen(port)
}
bootstrap()
