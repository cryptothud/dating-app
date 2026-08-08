import React from 'react'
import { Text, Link } from '@react-email/components'
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
  margin: '0 0 16px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const reasonBox = {
  backgroundColor: '#0f0b1a',
  borderRadius: '10px',
  padding: '16px 20px',
  margin: '0 0 20px',
}
const reasonText = {
  color: TEXT,
  fontSize: '14px',
  lineHeight: '22px',
  margin: 0,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

interface Props {
  reason: string
  appealEmail: string
}

export function AccountSuspendedEmail({ reason, appealEmail }: Props): React.JSX.Element {
  return (
    <Layout preview="Your CRUSH account has been suspended">
      <Text style={heading}>Your account has been suspended</Text>
      <Text style={body}>
        Your CRUSH account has been temporarily suspended due to a policy violation:
      </Text>
      <div style={reasonBox}>
        <Text style={reasonText}>{reason}</Text>
      </div>
      <Text style={body}>
        If you believe this is a mistake, you can appeal by emailing us at{' '}
        <Link href={`mailto:${appealEmail}`} style={{ color: PURPLE }}>
          {appealEmail}
        </Link>
        . Include your account email and a brief explanation.
      </Text>
    </Layout>
  )
}
