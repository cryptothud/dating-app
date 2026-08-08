import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalHeader } from '@/components/legal/legal-header'
import { LegalArticle } from '@/components/legal/legal-article'

export const metadata: Metadata = { title: 'Terms of Use — CRUSH' }

const EFFECTIVE = 'June 26, 2026'

export default function TermsPage(): React.JSX.Element {
  return (
    <div>
      <LegalHeader badge="Legal" title="Terms of Use" effectiveDate={EFFECTIVE} draft />

      <LegalArticle>
        <p>
          These Terms of Use (&quot;Terms&quot;) govern your access to and use of the CRUSH platform
          (&quot;Service&quot;) operated by Crush Inc. (&quot;we,&quot; &quot;us,&quot; or
          &quot;Company&quot;). By accessing the Service you agree to be bound by these Terms.
        </p>

        <h2>1. Eligibility</h2>
        <p>
          You must be at least 18 years of age to use CRUSH. By creating an account or browsing
          anonymously, you represent and warrant that you are 18 or older. The Service is currently
          available to residents of the United States only.
        </p>

        <h2>2. Account Registration</h2>
        <p>
          You may register using an email address and password, or via a supported third-party OAuth
          provider (Google, Apple, or Facebook). You are responsible for maintaining the
          confidentiality of your credentials. You must provide accurate information and keep it
          current. One account per person.
        </p>

        <h2>3. Phone Verification</h2>
        <p>
          To access messaging features, you must verify a valid US phone number via one-time
          passcode (OTP). Phone numbers are stored hashed and are not displayed to other users.
        </p>

        <h2>4. User Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Post, upload, or distribute content involving minors in a sexual context.</li>
          <li>Harass, threaten, stalk, or abuse other users.</li>
          <li>Impersonate any person or entity.</li>
          <li>Scrape, crawl, or extract data from the Service by automated means.</li>
          <li>Circumvent any security or rate-limiting measures.</li>
          <li>Use the Service for commercial solicitation without our written consent.</li>
          <li>Violate any applicable law or regulation.</li>
        </ul>

        <h2>5. Adult Content</h2>
        <p>
          CRUSH permits adult (NSFW) content on user profiles and in direct messages between users
          who have enabled NSFW viewing. You must be 18+ to view or post adult content. Content that
          depicts minors in any sexual context is strictly prohibited and will result in immediate
          account termination and mandatory reporting to NCMEC under 18 U.S.C. § 2258A.
        </p>

        <h2>6. Location Data</h2>
        <p>
          Your exact GPS coordinates are never shared with other users or third parties. Coordinates
          are fuzzed server-side within your chosen randomization radius (minimum 200 m) before
          being made available on the map. See our <Link href="/privacy">Privacy Policy</Link> for
          full details.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          You retain ownership of content you post. By posting content on CRUSH you grant us a
          worldwide, non-exclusive, royalty-free license to host, store, transmit, display, and
          distribute that content solely to operate the Service. We may remove content that violates
          these Terms without notice.
        </p>

        <h2>8. Subscriptions &amp; Payments</h2>
        <p>
          CRUSH offers optional paid subscriptions (Premium and Premium+). Subscription terms,
          pricing, and cancellation policies are disclosed at the time of purchase. You may cancel
          at any time in ≤ 2 taps from your account settings. No refunds for partial periods except
          where required by law.
        </p>

        <h2>9. Termination</h2>
        <p>
          We may suspend or terminate your account at any time for violations of these Terms,
          without prior notice. You may delete your account at any time from settings. Upon
          deletion, your personal data is removed within 30 days except where retention is required
          by law.
        </p>

        <h2>10. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL
          WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
          PARTICULAR PURPOSE. WE DO NOT GUARANTEE THE ACCURACY OF USER-GENERATED CONTENT.
        </p>

        <h2>11. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, CRUSH SHALL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT
          EXCEED THE GREATER OF $100 OR THE AMOUNT YOU PAID US IN THE LAST 12 MONTHS.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Delaware. Any disputes shall be
          resolved exclusively in the courts of Delaware.
        </p>

        <h2>13. Changes to These Terms</h2>
        <p>
          We may update these Terms at any time. We will notify registered users of material changes
          via email or in-app notice at least 14 days before the change takes effect.
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions about these Terms: <a href="mailto:legal@crush.app">legal@crush.app</a> · Crush
          Inc., Delaware, USA.
        </p>
      </LegalArticle>
    </div>
  )
}
