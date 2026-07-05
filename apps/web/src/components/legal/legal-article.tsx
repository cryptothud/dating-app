export function LegalArticle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <article className={[
      // Base: small muted text inherited by all children
      'text-sm text-muted-foreground leading-relaxed',

      // h2 — large display heading with bottom rule
      '[&_h2]:font-display [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground',
      '[&_h2]:text-2xl [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:pb-3',
      '[&_h2]:border-b [&_h2]:border-border',

      // h3 — small label-style subheading
      '[&_h3]:font-semibold [&_h3]:text-xs [&_h3]:uppercase [&_h3]:tracking-widest',
      '[&_h3]:text-muted-foreground/60 [&_h3]:mt-6 [&_h3]:mb-2',

      // paragraphs
      '[&_p]:mb-4 [&_p:last-child]:mb-0',

      // lists
      '[&_ul]:pl-5 [&_ul]:list-disc [&_ul]:mb-4 [&_ul]:space-y-1.5',
      '[&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:mb-4 [&_ol]:space-y-1.5',

      // bold — stands out from muted body
      '[&_strong]:text-foreground [&_strong]:font-semibold',

      // links
      '[&_a]:text-primary [&_a]:underline-offset-2 [&_a]:decoration-primary/40',
      'hover:[&_a]:decoration-primary',

      // address block (used in 2257 page)
      '[&_address]:not-italic [&_address]:pl-4 [&_address]:border-l-2 [&_address]:border-border',
    ].join(' ')}>
      {children}
    </article>
  )
}
