import React from 'react'
import { Text, Button } from '@react-email/components'
import { Layout, TEXT, MUTED, PURPLE } from './layout'

const heading = { color: TEXT, fontSize: '22px', fontWeight: 700, margin: '0 0 12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const body = { color: MUTED, fontSize: '15px', lineHeight: '24px', margin: '0 0 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const btn = { backgroundColor: PURPLE, borderRadius: '12px', color: '#fff', display: 'block', fontSize: '15px', fontWeight: 600, padding: '14px 28px', textAlign: 'center' as const, textDecoration: 'none', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const hint = { color: MUTED, fontSize: '12px', lineHeight: '18px', margin: '20px 0 0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }

interface Props {
  planName: string
  updateUrl: string
}

export function PaymentFailedEmail({ planName, updateUrl }: Props) {
  return (
    <Layout preview="Action needed: your CRUSH payment failed">
      <Text style={heading}>Payment failed</Text>
      <Text style={body}>
        We weren&apos;t able to charge your card for <strong style={{ color: TEXT }}>CRUSH {planName}</strong>. Your account has a short grace period — update your billing info to stay active.
      </Text>
      <Button href={updateUrl} style={btn}>Update billing info</Button>
      <Text style={hint}>
        If we can&apos;t collect payment after a few more attempts, your subscription will be paused. Reply to this email if you need help.
      </Text>
    </Layout>
  )
}
