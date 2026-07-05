import type { Metadata } from 'next'
import { LegalHeader } from '@/components/legal/legal-header'
import { LegalArticle } from '@/components/legal/legal-article'

export const metadata: Metadata = { title: 'Privacy Policy — CRUSH' }

const EFFECTIVE = 'June 26, 2026'

export default function PrivacyPage(): React.JSX.Element {
  return (
    <div>
      <LegalHeader badge="Legal" title="Privacy Policy" effectiveDate={EFFECTIVE} draft />

      <LegalArticle>

        <p>
          This Privacy Policy explains how Crush Inc. (&quot;CRUSH,&quot; &quot;we,&quot; or
          &quot;us&quot;) collects, uses, and protects your information when you use the CRUSH platform.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>Information you provide</h3>
        <ul>
          <li>Account information: email address, phone number (hashed), password (bcrypt)</li>
          <li>Profile information: display name, age, photos, bio, icebreaker responses</li>
          <li>Messages and voice notes sent through the Service</li>
          <li>Payment information (processed by Stripe — we never store card numbers)</li>
          <li>Reports and support tickets you submit</li>
        </ul>

        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Location data</strong> — GPS coordinates collected when you use the map.
            Your exact coordinates are never stored in plaintext. Coordinates are fuzzed server-side
            within your chosen radius (minimum 200 m) before any client receives them.
          </li>
          <li>Device type, browser, operating system, and IP address</li>
          <li>Usage events: pages visited, features used, session duration</li>
          <li>Trust score signals (report history, spam patterns)</li>
        </ul>

        <h3>Third-party sign-in</h3>
        <p>
          If you sign in via Google, Apple, or Facebook, we receive basic profile information (name,
          email) from that provider. We do not receive your social media password.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To operate the Service and display your profile to nearby users</li>
          <li>To enable messaging and voice notes</li>
          <li>To verify your phone number via OTP</li>
          <li>To process subscription payments through Stripe</li>
          <li>To detect and prevent abuse, spam, and prohibited content</li>
          <li>To send transactional emails (account verification, password reset, receipts)</li>
          <li>To improve the Service using aggregated, de-identified analytics</li>
          <li>To comply with legal obligations</li>
        </ul>

        <h2>3. Location Data — Special Protections</h2>
        <ul>
          <li>Raw GPS coordinates are never stored in our primary database.</li>
          <li>Only the fuzzed coordinate (within your chosen radius) is persisted.</li>
          <li>Location data is automatically purged after 5 minutes of inactivity.</li>
          <li>We do not sell location data to data brokers or advertisers.</li>
          <li>Law enforcement location requests require a valid legal process.</li>
        </ul>

        <h2>4. Sharing Your Information</h2>
        <p>We do not sell your personal data. We share data only with:</p>
        <ul>
          <li><strong>Other users</strong> — fuzzed location, public profile info, and messages you send</li>
          <li><strong>Stripe</strong> — payment processing</li>
          <li><strong>Cloudinary / Cloudflare R2</strong> — photo storage and delivery</li>
          <li><strong>Twilio</strong> — phone OTP delivery</li>
          <li><strong>Resend</strong> — transactional email delivery</li>
          <li><strong>Sentry</strong> — error monitoring (no PII in error payloads)</li>
          <li><strong>NCMEC</strong> — mandatory reporting of CSAM under 18 U.S.C. § 2258A</li>
          <li><strong>Law enforcement</strong> — when legally compelled by valid process</li>
        </ul>

        <h2>5. Data Retention</h2>
        <ul>
          <li>Active account data is retained while your account is open</li>
          <li>Deleted account data is purged within 30 days</li>
          <li>Message content is deleted when both parties delete the conversation</li>
          <li>Payment records retained for 7 years for tax compliance</li>
          <li>Abuse reports and CSAM-related records may be retained indefinitely</li>
        </ul>

        <h2>6. Your Rights (CCPA / CPRA)</h2>
        <p>California residents have the right to:</p>
        <ul>
          <li>Know what personal data we collect and how we use it</li>
          <li>Request deletion of your personal data</li>
          <li>Opt out of sale or sharing of personal data (we do not sell data)</li>
          <li>Correct inaccurate personal data</li>
          <li>Non-discrimination for exercising these rights</li>
        </ul>
        <p>
          To exercise these rights, email <a href="mailto:privacy@crush.app">privacy@crush.app</a>.
          We will respond within 45 days.
        </p>

        <h2>7. Security</h2>
        <p>
          We use industry-standard security: TLS 1.3 in transit, AES-256 at rest, httpOnly cookies
          for auth tokens, rate limiting on all endpoints, and regular security audits. If you
          discover a vulnerability, report it to{' '}
          <a href="mailto:security@crush.app">security@crush.app</a>.
        </p>

        <h2>8. Children</h2>
        <p>
          CRUSH is strictly for users 18 and older. We do not knowingly collect data from anyone
          under 18. If we discover a user is under 18, the account is terminated immediately. Contact{' '}
          <a href="mailto:safety@crush.app">safety@crush.app</a> to report a suspected minor.
        </p>

        <h2>9. Contact</h2>
        <p>
          Privacy questions: <a href="mailto:privacy@crush.app">privacy@crush.app</a> ·
          Crush Inc., Delaware, USA.
        </p>
      </LegalArticle>
    </div>
  )
}
