'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, ChevronDown, Loader2 } from 'lucide-react';
import { projectsApi, documentsApi } from '@/lib/api';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';
import type { Document } from '@/lib/types';

export default function ComparePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [leftDoc, setLeftDoc] = useState<Document | null>(null);
  const [rightDoc, setRightDoc] = useState<Document | null>(null);
  const [syncScroll, setSyncScroll] = useState(true);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  });

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => documentsApi.list(projectId),
  });

  const documents = documentsData?.documents || [];

  if (projectLoading || documentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    );
  }

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  const handleScroll = (source: 'left' | 'right') => {
    if (!syncScroll) return;

    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (!left || !right) return;

    if (source === 'left') {
      if (isSyncingLeft.current) {
        isSyncingLeft.current = false;
        return;
      }
      isSyncingRight.current = true;
      const percentage = left.scrollTop / (left.scrollHeight - left.clientHeight);
      right.scrollTop = percentage * (right.scrollHeight - right.clientHeight);
    } else {
      if (isSyncingRight.current) {
        isSyncingRight.current = false;
        return;
      }
      isSyncingLeft.current = true;
      const percentage = right.scrollTop / (right.scrollHeight - right.clientHeight);
      left.scrollTop = percentage * (left.scrollHeight - left.clientHeight);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${projectId}`}
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-100 dark:bg-stone-900 rounded-lg">
                  <Building2 className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <div>
                  <h1 className="text-lg font-serif text-[var(--text-primary)]">
                    Compare Documents
                  </h1>
                  <p className="text-sm text-[var(--text-muted)]">
                    {project?.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncScroll}
                    onChange={(e) => setSyncScroll(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-300 dark:peer-focus:ring-accent-800 rounded-full peer dark:bg-stone-900 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-accent-600"></div>
                </div>
                Sync scroll
              </label>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Document Selectors */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4">
            <DocumentSelector
              documents={documents}
              selected={leftDoc}
              onSelect={setLeftDoc}
              placeholder="Select left document"
            />
            <DocumentSelector
              documents={documents}
              selected={rightDoc}
              onSelect={setRightDoc}
              placeholder="Select right document"
            />
          </div>
        </div>
      </div>

      {/* Document Viewers */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 border-r border-[var(--border)] overflow-auto" ref={leftPanelRef} onScroll={() => handleScroll('left')}>
          <DocumentPanel document={leftDoc} projectId={projectId} />
        </div>
        <div className="flex-1 overflow-auto" ref={rightPanelRef} onScroll={() => handleScroll('right')}>
          <DocumentPanel document={rightDoc} projectId={projectId} />
        </div>
      </div>
    </div>
  );
}

function DocumentSelector({
  documents,
  selected,
  onSelect,
  placeholder,
}: {
  documents: Document[];
  selected: Document | null;
  onSelect: (doc: Document | null) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-[var(--surface-elevated)] rounded-lg border border-[var(--border)] flex items-center justify-between hover:border-[var(--text-muted)] transition-colors"
      >
        <span
          className={cn(
            'truncate',
            selected
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-muted)]'
          )}
        >
          {selected?.filename || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] rounded-lg shadow-warm-lg border border-[var(--border)] py-1 z-10 max-h-60 overflow-auto">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                onSelect(doc);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors',
                selected?.id === doc.id && 'bg-accent-50 dark:bg-accent-950/20'
              )}
            >
              {doc.filename}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentPanel({
  document,
  projectId,
}: {
  document: Document | null;
  projectId: string;
}) {
  if (!document) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Select a document to view
      </div>
    );
  }

  const fileUrl = documentsApi.getFileUrl(projectId, document.id);

  return (
    <div className="h-full" style={{ backgroundColor: 'var(--background)' }}>
      {document.file_type === 'pdf' ? (
        <iframe
          src={fileUrl}
          className="w-full h-full"
          title={document.filename}
        />
      ) : document.file_type === 'image' ? (
        <div className="h-full overflow-auto p-4">
          <img
            src={fileUrl}
            alt={document.filename}
            className="max-w-full mx-auto"
          />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
          <div className="text-center">
            <p>Preview not available for this file type.</p>
            <a
              href={fileUrl}
              download
              className="text-accent-600 dark:text-accent-400 hover:underline mt-2 inline-block"
            >
              Download file
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
