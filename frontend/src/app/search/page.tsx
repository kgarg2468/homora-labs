'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Search,
  FileText,
  MessageSquare,
  Loader2,
  Filter,
} from 'lucide-react';
import { searchApi } from '@/lib/api';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { SearchResult } from '@/lib/types';
import { formatRelativeTime, truncate, getCategoryColor } from '@/lib/utils';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<'all' | 'documents' | 'conversations'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);

  const searchMutation = useMutation({
    mutationFn: () =>
      searchApi.search({
        query,
        search_type: searchType,
        limit: 50,
      }),
    onSuccess: (data) => {
      setResults(data.results);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Search
                </h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents and conversations..."
                leftIcon={<Search className="w-5 h-5" />}
                autoFocus
              />
            </div>
            <Button type="submit" isLoading={searchMutation.isPending}>
              Search
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-4 h-4" />
              Filter:
            </span>
            {(['all', 'documents', 'conversations'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSearchType(type)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${searchType === type
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </form>

        {/* Results */}
        {searchMutation.isPending ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {results.length} results found
            </p>
            {results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={
                  result.type === 'conversation'
                    ? `/projects/${result.project_id}?conversation=${result.id}`
                    : `/projects/${result.project_id}?document=${result.document_id}`
                }
                className="block p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    {result.type === 'conversation' ? (
                      <MessageSquare className="w-5 h-5 text-slate-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {result.title}
                      </h3>
                      {result.page_number && (
                        <Badge size="sm">Page {result.page_number}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {truncate(result.snippet, 200)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{result.project_name}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(result.created_at)}</span>
                      <span>·</span>
                      <span>Score: {result.relevance_score.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : query && !searchMutation.isPending ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No results found
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Try adjusting your search terms or filters
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Search across all your projects
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Find documents and conversations by keywords
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
