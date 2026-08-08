import React from 'react'
import { Text, Section, Row, Column } from '@react-email/components'
import { Layout, TEXT, MUTED, PURPLE, BORDER } from './layout'

const heading = {
  color: TEXT,
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 4px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const sub = {
  color: MUTED,
  fontSize: '14px',
  margin: '0 0 24px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const receiptBox = {
  backgroundColor: '#0f0b1a',
  borderRadius: '10px',
  padding: '20px',
  border: `1px solid ${BORDER}`,
  margin: '0 0 20px',
}
const label = {
  color: MUTED,
  fontSize: '12px',
  margin: '0 0 2px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const value = {
  color: TEXT,
  fontSize: '15px',
  fontWeight: 600,
  margin: '0 0 12px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const hint = {
  color: MUTED,
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

interface Props {
  planName: string
  amount: string
  periodEnd: string
}

export function SubscriptionReceiptEmail({
  planName,
  amount,
  periodEnd,
}: Props): React.JSX.Element {
  return (
    <Layout preview={`Your CRUSH ${planName} receipt — ${amount}`}>
      <Text style={heading}>Payment confirmed</Text>
      <Text style={sub}>Here&apos;s your receipt for CRUSH {planName}.</Text>
      <Section style={receiptBox}>
        <Row>
          <Column>
            <Text style={label}>Plan</Text>
            <Text style={{ ...value, color: PURPLE }}>{planName}</Text>
          </Column>
          <Column style={{ textAlign: 'right' as const }}>
            <Text style={label}>Amount</Text>
            <Text style={value}>{amount}</Text>
          </Column>
        </Row>
        <Text style={label}>Next billing date</Text>
        <Text style={{ ...value, margin: 0 }}>{periodEnd}</Text>
      </Section>
      <Text style={hint}>
        Manage or cancel your subscription anytime in Settings → Subscription. Questions? Reply to
        this email.
      </Text>
    </Layout>
  )
}
