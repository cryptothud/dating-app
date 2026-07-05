import React from 'react'
import { Text } from '@react-email/components'
import { Layout, TEXT, MUTED } from './layout'

const heading = { color: TEXT, fontSize: '22px', fontWeight: 700, margin: '0 0 12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const body = { color: MUTED, fontSize: '15px', lineHeight: '24px', margin: '0 0 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const recoveryNote = { color: TEXT, fontSize: '14px', lineHeight: '22px', margin: '0 0 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontStyle: 'italic' as const }

interface Props {
  recoveryDeadline: string
}

export function AccountDeletedEmail({ recoveryDeadline }: Props) {
  return (
    <Layout preview="Your CRUSH account has been deleted">
      <Text style={heading}>Account deleted</Text>
      <Text style={body}>
        Your CRUSH account and all associated data have been queued for deletion. This process completes within 30 days.
      </Text>
      <Text style={recoveryNote}>
        Changed your mind? You can recover your account by signing in before <strong>{recoveryDeadline}</strong>.
        After that date, your data is permanently removed and cannot be recovered.
      </Text>
      <Text style={body}>
        If you didn&apos;t request this deletion, contact us immediately by replying to this email.
      </Text>
    </Layout>
  )
}
