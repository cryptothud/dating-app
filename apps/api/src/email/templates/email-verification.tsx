import React from 'react'
import { Text, Button } from '@react-email/components'
import { Layout, TEXT, MUTED, PURPLE } from './layout'

const heading = { color: TEXT, fontSize: '22px', fontWeight: 700, margin: '0 0 12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const body = { color: MUTED, fontSize: '15px', lineHeight: '24px', margin: '0 0 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const btn = { backgroundColor: PURPLE, borderRadius: '12px', color: '#fff', display: 'block', fontSize: '15px', fontWeight: 600, padding: '14px 28px', textAlign: 'center' as const, textDecoration: 'none', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const hint = { color: MUTED, fontSize: '12px', lineHeight: '18px', margin: '20px 0 0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }

interface Props {
  verifyUrl: string
}

export function EmailVerificationEmail({ verifyUrl }: Props) {
  return (
    <Layout preview="Verify your email address for CRUSH">
      <Text style={heading}>Verify your email</Text>
      <Text style={body}>
        Click the button below to confirm your email address. This link expires in <strong style={{ color: TEXT }}>24 hours</strong>.
      </Text>
      <Button href={verifyUrl} style={btn}>Verify email</Button>
      <Text style={hint}>
        If you didn&apos;t create a CRUSH account, you can safely ignore this email.
      </Text>
    </Layout>
  )
}
