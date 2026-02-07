'use client';

import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowUpSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  className?: string;
}

export function FollowUpSuggestions({
  suggestions,
  onSelect,
  className,
}: FollowUpSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
      >
        <Lightbulb className="w-4 h-4 text-accent-500" />
        <span>Suggested follow-ups</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      {isExpanded && (
        <div className="flex flex-wrap gap-2 animate-slide-down">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSelect(suggestion)}
              className="px-3 py-1.5 text-sm bg-[var(--surface-elevated)] text-[var(--text-secondary)] rounded-lg border border-[var(--border-subtle)] hover:bg-accent-100 dark:hover:bg-accent-950/30 hover:text-accent-700 dark:hover:text-accent-400 hover:border-accent-300 dark:hover:border-accent-800 transition-all duration-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
