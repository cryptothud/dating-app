interface LegalHeaderProps {
  badge: string
  title: string
  effectiveDate?: string
  draft?: boolean
}

export function LegalHeader({ badge, title, effectiveDate, draft }: LegalHeaderProps): React.JSX.Element {
  return (
    <div className="mb-10 pb-8 border-b border-border space-y-3">
      <div className="inline-flex items-center rounded-full bg-muted border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
        {badge}
      </div>
      <h1 className="font-display font-bold text-3xl sm:text-4xl text-foreground tracking-tight">{title}</h1>
      {(effectiveDate || draft) && (
        <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
          {effectiveDate && <span>Effective {effectiveDate}</span>}
          {effectiveDate && draft && <span className="text-muted-foreground/40">·</span>}
          {draft && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current opacity-80"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.75.75 0 010 1.5.75.75 0 010-1.5zM7 7h2v4.5H7V7z"/></svg>
              Draft — pending legal review
            </span>
          )}
        </p>
      )}
    </div>
  )
}
