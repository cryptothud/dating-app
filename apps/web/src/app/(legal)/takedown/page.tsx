import type { Metadata } from 'next'
import { LegalHeader } from '@/components/legal/legal-header'
import { LegalArticle } from '@/components/legal/legal-article'

export const metadata: Metadata = { title: 'TAKE IT DOWN Act Policy — CRUSH' }

export default function TakedownPage(): React.JSX.Element {
  return (
    <div>
      <LegalHeader badge="Legal" title="TAKE IT DOWN Act Policy" effectiveDate="June 2026" draft />

      <LegalArticle>
        <p>
          The TAKE IT DOWN Act (Pub. L. No. 119-___, signed 2025) requires online platforms to
          remove intimate visual depictions of minors within 48 hours of receiving a valid notice.
          Crush Inc. is committed to full compliance with this law.
        </p>

        <h2>What This Policy Covers</h2>
        <p>
          This policy applies to intimate visual depictions — including AI-generated or digitally
          altered images — that depict a real minor (under 18) in a sexual or intimate context,
          posted on CRUSH without the minor&apos;s consent.
        </p>

        <h2>How to Submit a Notice</h2>
        <p>
          If you are a minor, or the parent or guardian of a minor, depicted in intimate content on
          CRUSH without consent:
        </p>
        <ol>
          <li>
            Email <a href="mailto:takedown@crush.app">takedown@crush.app</a> with the subject line{' '}
            <strong>&quot;TAKE IT DOWN Act Request&quot;</strong>.
          </li>
          <li>
            Include: your name and relationship to the minor; a description of the content and its
            location on our platform (URL or screenshot); and a statement that the depicted person
            is a minor.
          </li>
          <li>
            We will acknowledge your request within 24 hours and complete removal or blocking within
            48 hours of a valid notice.
          </li>
        </ol>

        <h2>Our Response Commitment</h2>
        <ul>
          <li>Acknowledge notice within 24 hours</li>
          <li>Remove or block content within 48 hours of valid notice</li>
          <li>Preserve records as required by law</li>
          <li>Permanently ban the user who uploaded the content</li>
          <li>Report to NCMEC if content qualifies as CSAM under 18 U.S.C. § 2258A</li>
        </ul>

        <h2>Hash Matching &amp; Re-Upload Prevention</h2>
        <p>
          CRUSH uses PhotoDNA-based hash matching to prevent re-upload of known CSAM and intimate
          images of minors. Removed content is hashed and blocklisted to prevent reappearance on our
          platform or any platform using the same hash database.
        </p>

        <h2>Contact</h2>
        <p>
          TAKE IT DOWN Act requests: <a href="mailto:takedown@crush.app">takedown@crush.app</a>
          <br />
          General safety concerns: <a href="mailto:safety@crush.app">safety@crush.app</a>
        </p>

        <p className="text-muted-foreground/70 text-sm">
          This policy will be updated as regulatory guidance under the TAKE IT DOWN Act is issued by
          the FTC. Last reviewed June 2026.
        </p>
      </LegalArticle>
    </div>
  )
}
