'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-stone-100 dark:bg-stone-900 text-[var(--text-secondary)]',
    success: 'bg-[#5E8C61]/10 text-[#5E8C61] dark:bg-[#5E8C61]/15 dark:text-[#7DA97F]',
    warning: 'bg-[#C4973B]/10 text-[#C4973B] dark:bg-[#C4973B]/15 dark:text-[#D4A74B]',
    error: 'bg-[#B85450]/10 text-[#B85450] dark:bg-[#B85450]/15 dark:text-[#C87470]',
    info: 'bg-[#5B7B9A]/10 text-[#5B7B9A] dark:bg-[#5B7B9A]/15 dark:text-[#7B9BBA]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-medium rounded-md tracking-wide uppercase',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
