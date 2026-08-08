import type { Metadata } from 'next'
import { LegalHeader } from '@/components/legal/legal-header'
import { LegalArticle } from '@/components/legal/legal-article'

export const metadata: Metadata = { title: 'Report or Request Content Removal — CRUSH' }

const CONTACTS = [
  { label: 'Safety & abuse', email: 'safety@crush.app' },
  { label: 'NCII removal', email: 'ncii@crush.app' },
  { label: 'TAKE IT DOWN Act', email: 'takedown@crush.app' },
  { label: 'Copyright / DMCA', email: 'dmca@crush.app' },
  { label: 'General abuse', email: 'abuse@crush.app' },
]

const RESPONSE_TIMES = [
  { type: 'CSAM / minors in sexual content', time: 'Immediate (automated) + 24-hour human review' },
  { type: 'Non-consensual intimate images', time: 'Within 24 hours' },
  { type: 'TAKE IT DOWN Act requests', time: 'Within 48 hours' },
  { type: 'Harassment / threats', time: 'Within 24 hours' },
  { type: 'Impersonation', time: 'Within 72 hours' },
  { type: 'DMCA copyright', time: 'Within 10 business days' },
  { type: 'General reports', time: 'Within 24 hours' },
]

export default function ContentRemovalPage(): React.JSX.Element {
  return (
    <div>
      <LegalHeader badge="Safety" title="Report or Request Content Removal" draft />

      <LegalArticle>
        <p>
          CRUSH provides multiple channels for reporting harmful content or requesting the removal
          of content that depicts you without your consent.
        </p>

        <h2>In-App Reporting (Fastest)</h2>
        <p>
          The fastest way to report is through the app. Tap the flag icon on any profile, photo, or
          message. Your report goes directly to our moderation team and is reviewed within 24 hours.
        </p>

        <h2>Types of Requests We Handle</h2>

        <h3>Non-Consensual Intimate Images (NCII)</h3>
        <p>
          If intimate images of you have been posted without your consent, email{' '}
          <a href="mailto:ncii@crush.app">ncii@crush.app</a> with a description of the content and
          its location. We remove verified NCII within 24 hours and permanently ban the uploader.
        </p>

        <h3>Content Depicting Minors</h3>
        <p>
          Report to <a href="mailto:safety@crush.app">safety@crush.app</a> or via our{' '}
          <a href="/takedown">TAKE IT DOWN Act page</a>. Removal within 48 hours. All confirmed
          cases are reported to NCMEC.
        </p>

        <h3>Impersonation</h3>
        <p>
          If someone is using your photos or impersonating you, email{' '}
          <a href="mailto:safety@crush.app">safety@crush.app</a> with proof of identity and a link
          to the infringing profile.
        </p>

        <h3>DMCA / Copyright</h3>
        <p>
          To submit a DMCA takedown notice, email <a href="mailto:dmca@crush.app">dmca@crush.app</a>
          . Your notice must include:
        </p>
        <ul>
          <li>Identification of the copyrighted work and infringing material</li>
          <li>Your contact information</li>
          <li>A good-faith belief statement that the use is not authorized</li>
          <li>A statement of accuracy under penalty of perjury</li>
          <li>Your physical or electronic signature</li>
        </ul>

        <h3>General Abuse / Spam</h3>
        <p>
          Use the in-app report button. For unresolved issues:{' '}
          <a href="mailto:abuse@crush.app">abuse@crush.app</a>.
        </p>
      </LegalArticle>

      {/* Response times table */}
      <div className="mt-10 space-y-4">
        <h2 className="font-display text-foreground text-xl font-bold tracking-tight">
          Response Times
        </h2>
        <div className="border-border overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="text-foreground px-4 py-3 text-left font-medium">Request type</th>
                <th className="text-foreground px-4 py-3 text-left font-medium">Response time</th>
              </tr>
            </thead>
            <tbody>
              {RESPONSE_TIMES.map((r, i) => (
                <tr
                  key={r.type}
                  className={i < RESPONSE_TIMES.length - 1 ? 'border-border border-b' : ''}
                >
                  <td className="text-foreground px-4 py-3">{r.type}</td>
                  <td className="text-muted-foreground px-4 py-3">{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact directory */}
      <div className="mt-10 space-y-4">
        <h2 className="font-display text-foreground text-xl font-bold tracking-tight">
          Contact Directory
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTACTS.map((c) => (
            <a
              key={c.email}
              href={`mailto:${c.email}`}
              className="border-border bg-card hover:border-primary/30 hover:bg-primary/3 group flex items-center justify-between rounded-xl border px-4 py-3 no-underline transition-colors"
            >
              <span className="text-foreground text-sm font-medium">{c.label}</span>
              <span className="text-muted-foreground group-hover:text-primary text-sm transition-colors">
                {c.email}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
