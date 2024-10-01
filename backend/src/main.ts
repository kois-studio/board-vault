import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { validateEnv } from './common/validators'
import { NextFunction, Request, Response } from 'express'

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
    const app = await NestFactory.create(AppModule)

    app.enableCors({
        origin: ['https://board-vault-front.vercel.app', 'http://localhost:4200'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    })

    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', 'https://board-vault-front.vercel.app')
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            res.setHeader('Access-Control-Allow-Credentials', 'true')
            res.status(204).end() // End response for OPTIONS preflight
        } else {
            next()
        }
    })

    // Create the swagger documentation
    const swaggerConfig = new DocumentBuilder()
        .setTitle('BoardVault Swagger API')
        .setDescription('Test the BoardVault endpoints.')
        .setVersion('1.0')
        .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)

    SwaggerModule.setup('swagger', app, document)
    logger.verbose(`NestJS is running on http://localhost:${port}`)
    logger.verbose(`Swagger running http://localhost:${port}/swagger`)

    // Start the application
    await app.listen(port)
}
bootstrap()
