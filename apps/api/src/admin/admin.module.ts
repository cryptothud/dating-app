import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { EmailModule } from '../email/email.module'
import { PushModule } from '../push/push.module'
import { WarnBusModule } from '../warn-bus/warn-bus.module'
import { AdminService } from './admin.service'
import { AdminController, AdminPublicController } from './admin.controller'
import { AuditService } from './audit.service'

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EmailModule,
    PushModule,
    WarnBusModule,
    JwtModule.register({}),
  ],
  controllers: [AdminPublicController, AdminController],
  providers: [AdminService, AuditService],
  exports: [AuditService, AdminService],
})
export class AdminModule {}
