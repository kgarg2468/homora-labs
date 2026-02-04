'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, MessageSquare, Loader2 } from 'lucide-react';
import { Command } from 'cmdk';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { searchApi } from '@/lib/api';
import type { SearchResult } from '@/lib/types';
import { formatRelativeTime, truncate } from '@/lib/utils';

export function SearchModal() {
  const router = useRouter();
  const { isSearchOpen, setIsSearchOpen } = useKeyboardShortcuts();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await searchApi.search({ query: q, limit: 10 });
      setResults(response.results);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, search]);

  useEffect(() => {
    if (!isSearchOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isSearchOpen]);

  const handleSelect = (result: SearchResult) => {
    setIsSearchOpen(false);
    if (result.type === 'conversation') {
      router.push(`/projects/${result.project_id}?conversation=${result.id}`);
    } else {
      router.push(`/projects/${result.project_id}?document=${result.document_id}`);
    }
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsSearchOpen(false)}
      />

      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
        <Command className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <Search className="w-5 h-5 text-slate-400" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search documents and conversations..."
              className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              autoFocus
            />
            {isLoading && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
          </div>

          <Command.List className="max-h-80 overflow-auto p-2">
            {query.length > 0 && results.length === 0 && !isLoading && (
              <Command.Empty className="text-center py-8 text-slate-500 dark:text-slate-400">
                No results found
              </Command.Empty>
            )}

            {results.map((result) => (
              <Command.Item
                key={`${result.type}-${result.id}`}
                value={result.title}
                onSelect={() => handleSelect(result)}
                className="flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-700"
              >
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg mt-0.5">
                  {result.type === 'conversation' ? (
                    <MessageSquare className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {result.title}
                    </span>
                    {result.page_number && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Page {result.page_number}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {truncate(result.snippet, 100)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>{result.project_name}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(result.created_at)}</span>
                  </div>
                </div>
              </Command.Item>
            ))}
          </Command.List>

          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">↵</kbd> Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Esc</kbd> Close
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
