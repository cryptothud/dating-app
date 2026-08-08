import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IoAdapter } from '@nestjs/platform-socket.io'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import type { Env } from './config/configuration'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true })

  const config = app.get(ConfigService<Env, true>)
  const isProd = config.get('NODE_ENV', { infer: true }) === 'production'

  // Security headers — CSP enabled in all environments; COEP only in prod (dev tools break otherwise)
  app.use(
    helmet({
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: isProd,
    }),
  )

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app))

  // Cookie parsing
  app.use(cookieParser())

  // CORS — locked to explicit origins in all environments.
  // Add more dev origins to the array if you need LAN device access.
  app.enableCors({
    origin: isProd ? config.get('WEB_URL', { infer: true }) : ['http://localhost:3000', 'http://127.0.0.1:3000'],
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

  // Health check for Railway (registered before global prefix takes effect)
  app.getHttpAdapter().get('/api/health', (_req: unknown, res: { json: (o: object) => void }): void => {
    res.json({ status: 'ok' })
  })

  const port = config.get('PORT', { infer: true })
  await app.listen(port)
}

void bootstrap()
