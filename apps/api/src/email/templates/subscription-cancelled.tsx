import React from 'react'
import { Text, Button } from '@react-email/components'
import { Layout, TEXT, MUTED, PURPLE } from './layout'

const heading = { color: TEXT, fontSize: '22px', fontWeight: 700, margin: '0 0 12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const body = { color: MUTED, fontSize: '15px', lineHeight: '24px', margin: '0 0 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const btn = { backgroundColor: PURPLE, borderRadius: '12px', color: '#fff', display: 'block', fontSize: '15px', fontWeight: 600, padding: '14px 28px', textAlign: 'center' as const, textDecoration: 'none', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }

interface Props {
  accessUntil: string
  reactivateUrl: string
}

export function SubscriptionCancelledEmail({ accessUntil, reactivateUrl }: Props) {
  return (
    <Layout preview="Your CRUSH Premium subscription has been cancelled">
      <Text style={heading}>Subscription cancelled</Text>
      <Text style={body}>
        Your CRUSH Premium subscription has been cancelled. You&apos;ll keep full access until <strong style={{ color: TEXT }}>{accessUntil}</strong>, then your account will revert to the free tier.
      </Text>
      <Text style={body}>
        Change your mind? You can reactivate any time — no waiting period, no setup fee.
      </Text>
      <Button href={reactivateUrl} style={btn}>Reactivate Premium</Button>
    </Layout>
  )
}
