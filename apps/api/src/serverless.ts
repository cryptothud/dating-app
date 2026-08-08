import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IoAdapter } from '@nestjs/platform-socket.io'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import type { Env } from './config/configuration'
import type { IncomingMessage, ServerResponse } from 'http'

// Reuse the same NestJS instance across warm invocations in the same container
let handlerCache: ((req: IncomingMessage, res: ServerResponse) => void) | null = null

async function createHandler(): Promise<(req: IncomingMessage, res: ServerResponse) => void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true })

  const config = app.get(ConfigService<Env, true>)

  app.use(helmet({ contentSecurityPolicy: true, crossOriginEmbedderPolicy: true }))
  app.useWebSocketAdapter(new IoAdapter(app))
  app.use(cookieParser())

  app.enableCors({
    origin: config.get('WEB_URL', { infer: true }),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  )

  app.setGlobalPrefix('api')
  app.getHttpAdapter().get('/api/health', (_req: unknown, res: { json: (o: object) => void }): void => {
    res.json({ status: 'ok' })
  })

  await app.init()
  return app.getHttpAdapter().getInstance() as (req: IncomingMessage, res: ServerResponse) => void
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!handlerCache) handlerCache = await createHandler()
  handlerCache(req, res)
}
