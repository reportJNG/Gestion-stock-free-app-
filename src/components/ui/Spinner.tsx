import clsx from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner = ({ size = 'md', className }: SpinnerProps) => (
  <span className={clsx('spinner', `spinner-${size}`, className)} aria-label="Loading" />
);
