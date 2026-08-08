import React from 'react'
import { Text } from '@react-email/components'
import { Layout, TEXT, MUTED } from './layout'

const heading = {
  color: TEXT,
  fontSize: '20px',
  fontWeight: 700,
  margin: '0 0 8px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const body = {
  color: MUTED,
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 20px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const msg = {
  color: TEXT,
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  whiteSpace: 'pre-wrap' as const,
}
const box = {
  background: '#1c1730',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '16px 0 24px',
}

export function SupportReplyEmail({ subject, replyBody }: { subject: string; replyBody: string }): React.JSX.Element {
  return (
    <Layout preview={`Re: ${subject}`}>
      <Text style={heading}>Re: {subject}</Text>
      <Text style={body}>Our support team has replied to your request:</Text>
      <div style={box}>
        <Text style={msg}>{replyBody}</Text>
      </div>
      <Text style={body}>
        If you have further questions, reply to this email or contact us at support@crush.app.
      </Text>
    </Layout>
  )
}
