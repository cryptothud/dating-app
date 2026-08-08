import React from 'react'
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components'
import type { ReactNode } from 'react'

const BG = '#0d0a16'
const CARD = '#1c1730'
const PURPLE = '#9333ea'
const TEXT = '#f0eef8'
const MUTED = '#8b7fa8'
const BORDER = '#2e2545'

const body = { backgroundColor: BG, margin: 0, padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const header = { marginBottom: '8px' }
const logoText = {
  color: PURPLE,
  fontWeight: 800 as const,
  fontSize: '22px',
  letterSpacing: '-0.5px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: '0 0 20px',
}
const card = {
  backgroundColor: CARD,
  borderRadius: '16px',
  padding: '32px',
  border: `1px solid ${BORDER}`,
}
const hr = { borderColor: BORDER, margin: '24px 0 16px' }
const footerText = {
  color: MUTED,
  fontSize: '11px',
  lineHeight: '18px',
  margin: '0 0 4px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const footerLink = { color: PURPLE }

export { TEXT, MUTED, PURPLE, CARD, BORDER }

interface LayoutProps {
  preview: string
  children: ReactNode
}

export function Layout({ preview, children }: LayoutProps): React.JSX.Element {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>CRUSH</Text>
          </Section>
          <Section style={card}>{children}</Section>
          <Section>
            <Hr style={hr} />
            <Text style={footerText}>
              You received this because you have a CRUSH account.{' '}
              <Link href="{{UNSUBSCRIBE_URL}}" style={footerLink}>
                Unsubscribe
              </Link>{' '}
              from marketing emails.
            </Text>
            <Text style={footerText}>© 2025 CRUSH LLC · San Francisco, CA 94105</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
