import React from 'react'
import { Text, Button } from '@react-email/components'
import { Layout, TEXT, MUTED, PURPLE } from './layout'

const heading = {
  color: TEXT,
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 12px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const body = {
  color: MUTED,
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const btn = {
  backgroundColor: PURPLE,
  borderRadius: '12px',
  color: '#fff',
  display: 'block',
  fontSize: '15px',
  fontWeight: 600,
  padding: '14px 28px',
  textAlign: 'center' as const,
  textDecoration: 'none',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const hint = {
  color: MUTED,
  fontSize: '12px',
  lineHeight: '18px',
  margin: '20px 0 0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

interface Props {
  resetUrl: string
}

export function PasswordResetEmail({ resetUrl }: Props) {
  return (
    <Layout preview="Reset your CRUSH password — link expires in 15 minutes">
      <Text style={heading}>Reset your password</Text>
      <Text style={body}>
        We received a request to reset your CRUSH password. Click the button below to set a new one.
        This link expires in <strong style={{ color: TEXT }}>15 minutes</strong>.
      </Text>
      <Button href={resetUrl} style={btn}>
        Reset password
      </Button>
      <Text style={hint}>
        If you didn&apos;t request this, you can safely ignore this email — your password won&apos;t
        change.
      </Text>
    </Layout>
  )
}
