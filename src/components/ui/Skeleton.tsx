import clsx from 'clsx';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

const toCss = (value?: string | number) => (typeof value === 'number' ? `${value}px` : value);

export const Skeleton = ({ width, height, borderRadius, className }: SkeletonProps) => (
  <div
    className={clsx('shimmer', className)}
    style={{
      width: toCss(width),
      height: toCss(height),
      borderRadius: toCss(borderRadius),
    }}
  />
);

Skeleton.Table = ({ rows = 5, className }: { rows?: number; className?: string }) => (
  <div className={clsx('skeleton-table', className)}>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="shimmer skeleton-row" />
    ))}
  </div>
);
