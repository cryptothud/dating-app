import { Controller, Post, Headers, Req, BadRequestException } from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { BillingService } from './billing.service'

@Controller('billing/webhook')
export class WebhookController {
  constructor(private billing: BillingService) {}

  @Post()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ): Promise<{ received: boolean }> {
    if (!sig) throw new BadRequestException('Missing stripe-signature header')
    if (!req.rawBody) throw new BadRequestException('Missing raw body')
    await this.billing.handleWebhook(req.rawBody, sig)
    return { received: true }
  }
}
