import React from 'react'
import { Text, Button, Link } from '@react-email/components'
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
  displayName?: string
  mapUrl: string
}

export function WelcomeEmail({ displayName, mapUrl }: Props): React.JSX.Element {
  const name = displayName ?? 'there'
  return (
    <Layout preview="Welcome to CRUSH — you're in.">
      <Text style={heading}>Hey {name}, welcome to CRUSH 👋</Text>
      <Text style={body}>
        Your account is live. Complete your profile so people nearby can find you on the map — add a
        photo, a few details about yourself, and flip on "Looking?" when you want to meet up.
      </Text>
      <Button href={mapUrl} style={btn}>
        Open the map
      </Button>
      <Text style={hint}>
        Have questions? Reply to this email or visit{' '}
        <Link href={mapUrl} style={{ color: PURPLE }}>
          crush.app
        </Link>
        .
      </Text>
    </Layout>
  )
}
