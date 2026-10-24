import * as React from 'react'

export interface CardProps {
  children: React.ReactNode
  className?: string
  /** Render a different element (default: div) */
  as?: React.ElementType
}

export function Card({ children, className = '', as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={[
        'rounded-xl bg-white shadow-sm ring-1 ring-gray-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  )
}
