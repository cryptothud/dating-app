import { api } from './api'

export interface SubscriptionStatus {
  active: boolean
  tier: string | null
  expiresAt: string | null
  cancelledAt: string | null
}

export const billing = {
  getSubscription: () => api.get<SubscriptionStatus>('/billing/subscription'),

  createCheckout: (tier: string, interval: string) =>
    api.post<{ url: string }>('/billing/checkout', { tier, interval }),

  createPortal: () => api.post<{ url: string }>('/billing/portal', {}),

  cancel: () => api.del<void>('/billing/cancel'),
}
