import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express'

import { AppModule } from './app.module'
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

    // Keep request bodies bounded before they reach controllers or providers.
    app.use(json({ limit: '100kb' }))
    app.use(urlencoded({ extended: false, limit: '100kb' }))

    app.use((_request: Request, response: Response, next: NextFunction) => {
        response.setHeader('X-Content-Type-Options', 'nosniff')
        response.setHeader('X-Frame-Options', 'DENY')
        response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')

        if (process.env.NODE_ENV === 'production') {
            response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        }

        next()
    })

    const defaultCorsOrigins = ['https://board-vault.com', 'http://localhost:4200', 'http://127.0.0.1:4200']
    const configuredCorsOrigins = process.env.CORS_ORIGINS?.split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0 && origin !== '*')
    const corsOrigins = [...new Set([...defaultCorsOrigins, ...(configuredCorsOrigins ?? [])])]

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
