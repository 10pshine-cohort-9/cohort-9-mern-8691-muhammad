import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border bg-white/70 dark:bg-white/5 px-4 text-sm outline-none transition-all',
          'placeholder:text-ink/40 dark:placeholder:text-paper/40',
          'focus:border-emerald-glow focus:ring-2 focus:ring-emerald-glow/30',
          hasError
            ? 'border-coral-glow focus:border-coral-glow focus:ring-coral-glow/30'
            : 'border-ink/10 dark:border-paper/15',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
