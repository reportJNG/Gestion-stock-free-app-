import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, label, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <label className="input-field" htmlFor={inputId}>
        {label ? <span>{label}</span> : null}
        <input ref={ref} id={inputId} className={clsx('input-control', className)} aria-invalid={Boolean(error)} {...props} />
        {error ? <small>{error}</small> : null}
      </label>
    );
  },
);

Input.displayName = 'Input';
