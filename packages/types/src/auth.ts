export interface JwtPayload {
  sub: string
  email: string
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  sub: string
  family: string
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
}

export interface SignupDto {
  email: string
  password: string
  phone: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface VerifyOtpDto {
  phone: string
  code: string
}
