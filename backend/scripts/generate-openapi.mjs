import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

const require = createRequire(import.meta.url)
const { AppModule } = require('../dist/app.module.js')
const outputPath = join(dirname(fileURLToPath(import.meta.url)), '../../docs/api/openapi.json')

const app = await NestFactory.create(AppModule, { logger: false })
const swaggerConfig = new DocumentBuilder()
    .setTitle('Board Vault API')
    .setDescription('Versioned contract snapshot for the Board Vault social group workspace API.')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
const document = SwaggerModule.createDocument(app, swaggerConfig)
await app.close()

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
console.log(`OpenAPI contract written to ${pathToFileURL(outputPath).pathname}`)
