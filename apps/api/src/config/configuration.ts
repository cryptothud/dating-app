import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  ALLOW_NSFW_CONTENT: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  AZURE_CONTENT_SAFETY_ENDPOINT: z.string().optional(),
  AZURE_CONTENT_SAFETY_KEY: z.string().optional(),
  GOOGLE_VISION_API_KEY: z.string().optional(),
  PHOTODNA_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_IDENTITY_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PREMIUM_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PREMIUM_ANNUAL: z.string().optional(),
  STRIPE_PRICE_PREMIUM_PLUS_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PREMIUM_PLUS_ANNUAL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('CRUSH <noreply@crush.app>'),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().default('mailto:support@crush.app'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    throw new Error(`Environment validation failed:\n${result.error.toString()}`)
  }
  return result.data
}

export default (): Env => validateEnv(process.env)
