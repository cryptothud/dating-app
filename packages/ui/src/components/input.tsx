import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className = '', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={[
        'bg-input border-border h-11 w-full rounded-lg border px-3 text-sm',
        'placeholder:text-muted-foreground text-foreground',
        'focus:ring-ring focus:border-transparent focus:outline-none focus:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-150',
        error ? 'border-destructive focus:ring-destructive' : '',
        className,
      ].join(' ')}
      {...props}
    />
  )
})
