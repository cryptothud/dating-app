'use client'

import { useState, useEffect } from 'react'
import { authApi } from '@/lib/auth'

interface AuthUser {
  id: string
  email: string
  verified: boolean
  role: string
}

interface UseAuthResult {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    authApi
      .me()
      .then((u) => setUser(u as AuthUser))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  return { user, isLoading, isAuthenticated: user !== null }
}
