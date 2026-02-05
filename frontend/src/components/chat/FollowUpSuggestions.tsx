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
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <Lightbulb className="w-4 h-4" />
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
              className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
