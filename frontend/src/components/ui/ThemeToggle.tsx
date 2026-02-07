'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = false, className }: ThemeToggleProps) {
  const { theme, setTheme, mounted } = useTheme();

  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const;

  return (
    <div className={cn('flex items-center', className)}>
      <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-lg">
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'p-2 rounded-md transition-all duration-200',
              !mounted
                ? 'text-[var(--text-muted)]'
                : theme === value
                  ? 'bg-accent-500 shadow-warm-sm text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
      {showLabel && mounted && (
        <span className="ml-2 text-sm text-[var(--text-secondary)] capitalize">
          {theme}
        </span>
      )}
    </div>
  );
}
