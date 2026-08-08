import React from 'react'
import { Text } from '@react-email/components'
import { Layout, TEXT, MUTED } from './layout'

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
}

export function AccountBannedEmail({ reason }: Props): React.JSX.Element {
  return (
    <Layout preview="Your CRUSH account has been permanently banned">
      <Text style={heading}>Your account has been permanently banned</Text>
      <Text style={body}>
        Your CRUSH account has been permanently banned for a severe violation of our Terms of
        Service:
      </Text>
      <div style={reasonBox}>
        <Text style={reasonText}>{reason}</Text>
      </div>
      <Text style={body}>
        This decision is final. Creating new accounts to circumvent this ban is a further violation
        of our Terms and may result in additional action.
      </Text>
    </Layout>
  )
}
