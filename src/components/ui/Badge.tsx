import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
}

export const Badge = ({ className, variant = 'neutral', ...props }: BadgeProps) => (
  <span className={clsx('badge', `badge-${variant}`, className)} {...props} />
);
