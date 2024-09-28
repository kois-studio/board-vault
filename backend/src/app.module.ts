import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { LoggerMiddleware } from './common/middlewares/logger.middleware'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './modules/database/database.module'

@Module({
    imports: [ConfigModule.forRoot(), DatabaseModule],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('database')
    }
}
