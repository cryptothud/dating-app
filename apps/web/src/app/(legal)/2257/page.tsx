import type { Metadata } from 'next'
import { LegalHeader } from '@/components/legal/legal-header'
import { LegalArticle } from '@/components/legal/legal-article'

export const metadata: Metadata = { title: '18 U.S.C. § 2257 Statement — CRUSH' }

export default function Page2257(): React.JSX.Element {
  return (
    <div>
      <LegalHeader badge="Legal" title="18 U.S.C. § 2257 Compliance Statement" draft />

      <LegalArticle>

        <p>
          CRUSH (operated by Crush Inc.) is an interactive computer service as defined by
          47 U.S.C. § 230(f)(2). The user-generated content available on this platform is created
          by third parties (our users), not by Crush Inc.
        </p>

        <h2>Exemption Claim</h2>
        <p>
          Crush Inc. is not the &quot;producer&quot; of any visual depictions of actual sexually
          explicit conduct as defined in 18 U.S.C. § 2256(2)(A)–(D) that appear on the CRUSH
          platform. All such visual depictions, if any, are user-generated content uploaded by
          platform users who are the primary and secondary producers of such content under
          18 U.S.C. § 2257.
        </p>
        <p>
          With respect to user-generated content, Crush Inc. is exempt from the record-keeping
          requirements of 18 U.S.C. § 2257 and 28 C.F.R. Part 75 pursuant to
          18 U.S.C. § 2257(h)(2)(B)(v) because CRUSH is an internet access service provider or
          hosting service that does not produce the sexually explicit content at issue.
        </p>

        <h2>Age Verification of Users</h2>
        <p>
          All CRUSH users must verify that they are 18 years of age or older at account creation via
          date-of-birth attestation and phone verification. Identity verification (government-issued
          ID + selfie via Stripe Identity) is available and encouraged for verified badge status.
          Accounts found to belong to minors are terminated immediately and any content is reported
          to NCMEC.
        </p>

        <h2>Custodian of Records</h2>
        <p>
          Notwithstanding our exemption claim, to the extent any records are required to be
          maintained, the designated records custodian is:
        </p>
        <address className="not-italic pl-4 border-l-2 border-border text-muted-foreground">
          Crush Inc.<br />
          Attn: Records Custodian / Legal Department<br />
          <a href="mailto:legal@crush.app">legal@crush.app</a>
        </address>

        <h2>User Responsibility</h2>
        <p>
          Users who upload visual depictions of sexually explicit conduct to CRUSH are primary
          producers under 18 U.S.C. § 2257 and are solely responsible for maintaining required
          age-verification records for performers depicted in such content. By uploading such
          content, users represent and warrant that all performers are 18 years of age or older and
          that they hold the required records.
        </p>

        <p className="text-sm text-muted-foreground/70">
          This statement was prepared based on current legal understanding and is subject to
          revision. Crush Inc. strongly recommends that any users uploading adult content consult
          qualified legal counsel regarding their obligations under 18 U.S.C. § 2257.
        </p>
      </LegalArticle>
    </div>
  )
}
