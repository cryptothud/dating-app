import type { Metadata } from 'next'
import { LegalHeader } from '@/components/legal/legal-header'
import { LegalArticle } from '@/components/legal/legal-article'

export const metadata: Metadata = { title: 'Safety Policy — CRUSH' }

export default function SafetyPage(): React.JSX.Element {
  return (
    <div>
      <LegalHeader badge="Safety" title="Safety Policy" draft />

      <LegalArticle>

        <p>
          Your safety is our highest priority. CRUSH is built for real-world connections, which means
          we take safety more seriously than most platforms. This policy explains what we do and what
          you can do.
        </p>

        <h2>Safety Features — Always Free</h2>
        <p>Safety is never paywalled. The following are free on all plans:</p>
        <ul>
          <li>
            <strong>Safety Date Mode</strong> — Share live date details (time, location, partner
            profile) with a trusted contact who receives real-time updates and an emergency alert
            if you don&apos;t check in on time.
          </li>
          <li>
            <strong>Block &amp; Report</strong> — Block any user instantly. Blocked users cannot
            see your profile or contact you.
          </li>
          <li>
            <strong>Location fuzzing</strong> — Your exact location is never shown. Choose your fuzz
            radius (200 m minimum). You control how precise your dot appears.
          </li>
          <li>
            <strong>Trust Score</strong> — Accounts are graded on verified phone, verified identity,
            report history, and spam signals. Low-trust accounts have limited visibility on the map.
          </li>
        </ul>

        <h2>Content Moderation</h2>
        <ul>
          <li>All uploaded images are automatically scanned by Azure Content Safety, Google Vision SafeSearch, and Cloudinary AI before reaching any storage.</li>
          <li>NSFW content is blurred by default and requires explicit user opt-in to view.</li>
          <li>Flagged content is reviewed by trained human moderators within 24 hours.</li>
          <li>Repeat violators are permanently banned and their device fingerprint is blocklisted.</li>
        </ul>

        <h2>Zero Tolerance: CSAM</h2>
        <p>Any content that sexually depicts minors is subject to:</p>
        <ol>
          <li>Immediate upload block — content is rejected before it reaches storage.</li>
          <li>Immediate account suspension — the account is locked pending investigation.</li>
          <li>
            Mandatory CyberTipline report to NCMEC as required by 18 U.S.C. § 2258A,
            filed within 24 hours.
          </li>
          <li>Referral to federal law enforcement.</li>
        </ol>
        <p>There are no second chances for CSAM. Zero exceptions.</p>

        <h2>Non-Consensual Intimate Images (NCII)</h2>
        <p>
          Posting intimate images of another person without their consent is prohibited and illegal
          in most US states. We remove verified NCII within 24 hours of a report.
          See <a href="/content-removal">Content Removal</a> to submit a request.
        </p>

        <h2>Harassment &amp; Abuse</h2>
        <p>
          Harassment, threats, stalking, and discriminatory abuse are prohibited. Reports are
          reviewed within 24 hours. Substantiated reports result in temporary suspension (first
          offense) or permanent ban (repeat offenses).
        </p>

        <h2>Meeting in Person</h2>
        <p>Before meeting someone from CRUSH:</p>
        <ul>
          <li>Use Safety Date Mode to share your plans with a trusted contact.</li>
          <li>Meet first in a public place.</li>
          <li>Tell someone where you&apos;re going and when you&apos;ll be back.</li>
          <li>Trust your instincts — if something feels off, leave.</li>
          <li>In an emergency, always call 911.</li>
        </ul>

        <h2>Reporting</h2>
        <p>
          Use the in-app report button on any profile, photo, or message. For urgent safety
          concerns: <a href="mailto:safety@crush.app">safety@crush.app</a>.
          In an emergency, contact local law enforcement (911).
        </p>
      </LegalArticle>
    </div>
  )
}
