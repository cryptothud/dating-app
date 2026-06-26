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
        'w-full h-11 px-3 rounded-lg text-sm bg-input border border-border',
        'placeholder:text-muted-foreground text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-150',
        error ? 'border-destructive focus:ring-destructive' : '',
        className,
      ].join(' ')}
      {...props}
    />
  )
})
