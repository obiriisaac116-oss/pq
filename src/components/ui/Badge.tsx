import * as React from 'react'

export type BadgeColor =
  | 'blue'
  | 'purple'
  | 'green'
  | 'yellow'
  | 'red'
  | 'gray'

export interface BadgeProps {
  children: React.ReactNode
  color?: BadgeColor
  className?: string
}

const colorClasses: Record<BadgeColor, string> = {
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
}

export function Badge({
  children,
  color = 'blue',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorClasses[color],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
