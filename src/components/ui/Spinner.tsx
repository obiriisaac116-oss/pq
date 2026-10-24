import * as React from 'react'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  size?: SpinnerSize
  /** Override the accessible label (defaults to "Loading…") */
  'aria-label'?: string
  'aria-hidden'?: boolean | 'true' | 'false'
  className?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4',
}

export function Spinner({
  size = 'md',
  'aria-label': ariaLabel = 'Loading…',
  'aria-hidden': ariaHidden,
  className = '',
}: SpinnerProps) {
  return (
    <span
      role={ariaHidden ? undefined : 'status'}
      aria-label={ariaHidden ? undefined : ariaLabel}
      aria-hidden={ariaHidden}
      className={['inline-block', className].filter(Boolean).join(' ')}
    >
      <span
        className={[
          'block animate-spin rounded-full border-brand-primary border-t-transparent',
          sizeClasses[size],
        ].join(' ')}
      />
      {!ariaHidden && <span className="sr-only">{ariaLabel}</span>}
    </span>
  )
}
