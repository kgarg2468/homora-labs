'use client';

import Link from 'next/link';
import { FileText, MessageSquare } from 'lucide-react';
import type { SearchResult } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime, truncate } from '@/lib/utils';

interface SearchResultsProps {
  results: SearchResult[];
  onSelect?: (result: SearchResult) => void;
}

export function SearchResults({ results, onSelect }: SearchResultsProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <SearchResultItem key={`${result.type}-${result.id}`} result={result} onSelect={onSelect} />
      ))}
    </div>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  onSelect?: (result: SearchResult) => void;
}

function SearchResultItem({ result, onSelect }: SearchResultItemProps) {
  const handleClick = () => {
    onSelect?.(result);
  };

  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
      <div className="p-2 bg-slate-100 dark:bg-slate-600 rounded-lg mt-0.5">
        {result.type === 'conversation' ? (
          <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        ) : (
          <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
            {result.title}
          </span>
          {result.page_number && (
            <Badge size="sm">Page {result.page_number}</Badge>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
          {truncate(result.snippet, 150)}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
          <span>{result.project_name}</span>
          <span>·</span>
          <span>{formatRelativeTime(result.created_at)}</span>
        </div>
      </div>
    </div>
  );

  if (onSelect) {
    return <div onClick={handleClick}>{content}</div>;
  }

  const href =
    result.type === 'conversation'
      ? `/projects/${result.project_id}?conversation=${result.id}`
      : `/projects/${result.project_id}?document=${result.document_id}`;

  return <Link href={href}>{content}</Link>;
}
