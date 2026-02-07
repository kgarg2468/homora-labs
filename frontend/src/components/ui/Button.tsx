'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500/20 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-accent-600 text-white hover:bg-accent-700 shadow-warm-sm hover:shadow-warm-md',
      secondary:
        'bg-stone-100 dark:bg-stone-900 text-stone-500 dark:text-[var(--text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-950',
      ghost:
        'text-[var(--text-secondary)] hover:bg-stone-100 dark:hover:bg-stone-900',
      danger:
        'bg-[#B85450] text-white hover:bg-[#A34845] shadow-warm-sm',
      outline:
        'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-stone-100 dark:hover:bg-stone-900',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-accent-300" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
