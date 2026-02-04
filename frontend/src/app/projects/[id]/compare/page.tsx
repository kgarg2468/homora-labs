'use client';

import { useState } from 'react';
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${projectId}`}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Compare Documents
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {project?.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={syncScroll}
                  onChange={(e) => setSyncScroll(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                />
                Sync scroll
              </label>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Document Selectors */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-3">
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
      <div className="flex-1 flex">
        <div className="flex-1 border-r border-slate-200 dark:border-slate-700">
          <DocumentPanel document={leftDoc} projectId={projectId} />
        </div>
        <div className="flex-1">
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
        className="w-full px-3 py-2 text-left bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-between"
      >
        <span
          className={cn(
            'truncate',
            selected
              ? 'text-slate-900 dark:text-slate-100'
              : 'text-slate-500 dark:text-slate-400'
          )}
        >
          {selected?.filename || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10 max-h-60 overflow-auto">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                onSelect(doc);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700',
                selected?.id === doc.id && 'bg-primary-50 dark:bg-primary-900/20'
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
      <div className="h-full flex items-center justify-center text-slate-400">
        Select a document to view
      </div>
    );
  }

  const fileUrl = documentsApi.getFileUrl(projectId, document.id);

  return (
    <div className="h-full bg-slate-100 dark:bg-slate-900">
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
        <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
          <div className="text-center">
            <p>Preview not available for this file type.</p>
            <a
              href={fileUrl}
              download
              className="text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block"
            >
              Download file
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
