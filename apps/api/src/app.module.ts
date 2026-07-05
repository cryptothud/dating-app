import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import configuration, { validateEnv } from './config/configuration'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { AuthModule } from './auth/auth.module'
import { LocationModule } from './location/location.module'
import { ModerationModule } from './moderation/moderation.module'
import { PhotosModule } from './photos/photos.module'
import { IdentityModule } from './identity/identity.module'
import { ProfileModule } from './profile/profile.module'
import { ChatModule } from './chat/chat.module'
import { EventsModule } from './events/events.module'
import { SeenInWildModule } from './seen-in-wild/seen-in-wild.module'
import { EmailModule } from './email/email.module'
import { PushModule } from './push/push.module'
import { SafetyModule } from './safety/safety.module'
import { UsersModule } from './users/users.module'
import { AdminModule } from './admin/admin.module'
import { BillingModule } from './billing/billing.module'
import { GlobalExceptionFilter } from './common/filters/http-exception.filter'
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    LocationModule,
    ModerationModule,
    PhotosModule,
    IdentityModule,
    ProfileModule,
    ChatModule,
    EventsModule,
    SeenInWildModule,
    EmailModule,
    PushModule,
    SafetyModule,
    UsersModule,
    AdminModule,
    BillingModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MaintenanceMiddleware).forRoutes('*')
  }
}
