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
  senderName: string
  conversationUrl: string
}

export function MessagesWaitingEmail({ senderName, conversationUrl }: Props): React.JSX.Element {
  return (
    <Layout preview={`${senderName} sent you a message on CRUSH`}>
      <Text style={heading}>You have a message waiting</Text>
      <Text style={body}>
        <strong style={{ color: TEXT }}>{senderName}</strong> sent you a message on CRUSH. Jump back
        in and keep the conversation going.
      </Text>
      <Button href={conversationUrl} style={btn}>
        Read message
      </Button>
      <Text style={hint}>
        This is a one-time notification. We won&apos;t send another for this conversation until
        you&apos;ve had a chance to reply.
      </Text>
    </Layout>
  )
}
