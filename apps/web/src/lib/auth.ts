import { api } from './api'
import type { PublicUser } from '@dating-app/types'

export const authApi = {
  signup: (data: { email: string; password: string; phone: string; dateOfBirth: string }) =>
    api.post<{ message: string }>('/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ message: string }>('/auth/login', data),

  logout: () => api.post<{ message: string }>('/auth/logout'),

  refresh: () => api.post<{ message: string }>('/auth/refresh'),

  sendOtp: () => api.post<{ message: string }>('/auth/otp/send'),

  verifyOtp: (data: { phone: string; code: string }) =>
    api.post<{ message: string }>('/auth/otp/verify', data),

  me: () => api.get<PublicUser>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }),
}
