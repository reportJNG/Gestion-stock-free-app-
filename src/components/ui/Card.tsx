import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  clickable?: boolean;
  hover?: boolean;
}

export const Card = ({ className, clickable = false, hover = false, ...props }: CardProps) => (
  <div className={clsx('card', (clickable || hover) && 'card-hover', clickable && 'card-clickable', className)} {...props} />
);
