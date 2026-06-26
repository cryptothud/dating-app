import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import type { Env } from './config/configuration'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  const config = app.get(ConfigService<Env, true>)
  const isProd = config.get('NODE_ENV') === 'production'

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: isProd,
      crossOriginEmbedderPolicy: isProd,
    }),
  )

  // Cookie parsing
  app.use(cookieParser())

  // CORS — locked to client origin only
  app.enableCors({
    origin: config.get('CLIENT_URL'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })

  // Global validation — strip unknown fields, enforce all class-validator rules
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  )

  // Global prefix
  app.setGlobalPrefix('api')

  const port = config.get('PORT')
  await app.listen(port)
}

void bootstrap()
