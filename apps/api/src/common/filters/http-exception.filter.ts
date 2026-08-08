import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    const message =
      exception instanceof HttpException
        ? ((exception.getResponse() as { message?: string }).message ?? exception.message)
        : 'Internal server error'

    if (status >= 500) {
      const detail = exception instanceof Error ? exception.message : String(exception)
      this.logger.error(`${req.method} ${req.originalUrl} → ${status} — ${detail}`)
      if (process.env.NODE_ENV !== 'production' && exception instanceof Error && exception.stack) {
        this.logger.error(exception.stack)
      }
    }

    // For non-500 HTTP exceptions, preserve the original response body so clients
    // can read structured fields like validation errors, maintenance flags, etc.
    if (exception instanceof HttpException && status < 500) {
      const body = exception.getResponse()
      const responseBody =
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : { statusCode: status, ...body }
      res.status(status).json(responseBody)
      return
    }

    res.status(status).json({ statusCode: status, message })
  }
}
