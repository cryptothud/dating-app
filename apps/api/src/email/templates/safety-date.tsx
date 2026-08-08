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
  margin: '0 0 20px',
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
const sosBtn = {
  backgroundColor: '#dc2626',
  borderRadius: '12px',
  color: '#fff',
  display: 'block',
  fontSize: '15px',
  fontWeight: 700,
  padding: '14px 28px',
  textAlign: 'center' as const,
  textDecoration: 'none',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const hint = {
  color: MUTED,
  fontSize: '12px',
  lineHeight: '18px',
  margin: '16px 0 0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

export function SafetyDateStartedEmail({
  name,
  trackUrl,
  checkinTime,
}: {
  name: string
  trackUrl: string
  checkinTime: string
}): React.JSX.Element {
  return (
    <Layout preview={`${name} shared their location with you for safety`}>
      <Text style={heading}>{name} is on a date</Text>
      <Text style={body}>
        <strong style={{ color: TEXT }}>{name}</strong> is using CRUSH&apos;s Safety Date Mode and
        has shared their live location with you as a trusted contact. They&apos;ll check in by{' '}
        <strong style={{ color: TEXT }}>{checkinTime}</strong>.
      </Text>
      <Button href={trackUrl} style={btn}>
        Track their location
      </Button>
      <Text style={hint}>
        If they miss their check-in, you&apos;ll receive another alert. If you hear from them and
        they&apos;re safe, no action needed.
      </Text>
    </Layout>
  )
}

export function SafetyDateSosEmail({ name, trackUrl }: { name: string; trackUrl: string }): React.JSX.Element {
  return (
    <Layout preview={`🚨 SOS ALERT from ${name}`}>
      <Text style={{ ...heading, color: '#dc2626' }}>🚨 SOS Alert</Text>
      <Text style={body}>
        <strong style={{ color: TEXT }}>{name}</strong> has triggered an emergency SOS. Please check
        on them immediately and contact emergency services if needed.
      </Text>
      <Button href={trackUrl} style={sosBtn}>
        View their last known location
      </Button>
      <Text style={hint}>
        If this was a false alarm, they will need to contact you directly to let you know they are
        safe.
      </Text>
    </Layout>
  )
}

export function SafetyDateMissedCheckinEmail({
  name,
  trackUrl,
}: {
  name: string
  trackUrl: string
}): React.JSX.Element {
  return (
    <Layout preview={`⚠️ ${name} missed their safety check-in`}>
      <Text style={{ ...heading, color: '#d97706' }}>⚠️ Missed Check-In</Text>
      <Text style={body}>
        <strong style={{ color: TEXT }}>{name}</strong> has missed their scheduled safety check-in.
        Please try to reach them. Their last known location is available below.
      </Text>
      <Button href={trackUrl} style={btn}>
        View last known location
      </Button>
      <Text style={hint}>
        If you cannot reach them and believe they may be in danger, contact emergency services.
      </Text>
    </Layout>
  )
}
