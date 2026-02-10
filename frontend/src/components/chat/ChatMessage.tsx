'use client';

import { useState } from 'react';
import { User, Bot, Bug, Pencil, Check, X } from 'lucide-react';
import type { Message, Citation, DebugInfo } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (citation: Citation) => void;
  onInspect?: (debugInfo: DebugInfo) => void;
  onEditUserMessage?: (messageId: string, newContent: string) => Promise<void> | void;
  isEditingDisabled?: boolean;
}

export function ChatMessage({
  message,
  onCitationClick,
  onInspect,
  onEditUserMessage,
  isEditingDisabled = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [isSaving, setIsSaving] = useState(false);

  // Parse and render message content with citations
  const renderContent = () => {
    let content = message.content;

    // Replace citation references with clickable links
    const citationRegex = /\[Document:\s*([^,\]]+)(?:,\s*Page\s*(\d+))?(?:,\s*Section:\s*([^\]]+))?\]/g;

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Find matching citation
      const docName = match[1].trim();
      const citation = message.citations?.find((c) => c.document_name === docName);

      // Add citation link
      parts.push(
        <button
          type="button"
          key={match.index}
          onClick={() => citation && onCitationClick?.(citation)}
          className="citation-link"
        >
          [{docName}
          {match[2] ? `, p.${match[2]}` : ''}
          {match[3] ? `, ${match[3].trim()}` : ''}]
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts;
  };

  // Render structured sections for assistant messages
  const renderStructuredContent = () => {
    const content = message.content;
    const sections = [
      { header: '**Answer:**', key: 'answer' },
      { header: '**Evidence:**', key: 'evidence' },
      { header: '**Risk Flags:**', key: 'risks' },
      { header: '**Unknowns:**', key: 'unknowns' },
      { header: '**Next Steps:**', key: 'next_steps' },
    ];

    // Check if content has structured format
    const hasStructure = sections.some((s) => content.includes(s.header));

    if (!hasStructure) {
      return <div className="prose">{renderContent()}</div>;
    }

    return (
      <div className="prose space-y-4">
        {sections.map(({ header, key }) => {
          const startIdx = content.indexOf(header);
          if (startIdx === -1) return null;

          // Find the end of this section
          let endIdx = content.length;
          for (const { header: nextHeader } of sections) {
            if (nextHeader === header) continue;
            const nextIdx = content.indexOf(nextHeader, startIdx + header.length);
            if (nextIdx !== -1 && nextIdx < endIdx) {
              endIdx = nextIdx;
            }
          }

          const sectionContent = content.slice(startIdx + header.length, endIdx).trim();

          return (
            <div key={key} className="border-l-2 border-accent-400 pl-3">
              <h3 className="font-serif text-sm font-semibold text-[var(--text-primary)] mb-2">
                {header.replace(/\*\*/g, '')}
              </h3>
              <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                {sectionContent}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'flex gap-4 p-4 rounded-xl message-enter transition-colors',
        isUser
          ? 'bg-accent-50 dark:bg-accent-950/15 border border-accent-200/50 dark:border-accent-800/30'
          : 'bg-[var(--surface)] border border-[var(--border)]'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-accent-600 text-white'
            : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-[var(--text-primary)]">
            {isUser ? 'You' : 'Homora'}
          </span>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            {formatDateTime(message.created_at)}
          </span>

          {/* Inspect button for assistant messages with debug_info */}
          {!isUser && message.debug_info && onInspect && (
            <button
              type="button"
              onClick={() => onInspect(message.debug_info!)}
              className={cn(
                'ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
                'text-[var(--text-muted)] hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-950/20'
              )}
              title="Inspect RAG pipeline"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Inspect</span>
            </button>
          )}

          {isUser && onEditUserMessage && (
            <button
              type="button"
              onClick={() => {
                setDraft(message.content);
                setIsEditing(true);
              }}
              disabled={isEditingDisabled || isSaving}
              className={cn(
                'ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
                'text-[var(--text-muted)] hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-950/20',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Edit and regenerate from here"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {isUser ? (
          isEditing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border resize-y min-h-[96px]',
                  'bg-[var(--background)] border-[var(--border)] text-[var(--text-primary)]',
                  'focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500'
                )}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!draft.trim() || isSaving) return;
                    setIsSaving(true);
                    try {
                      await onEditUserMessage?.(message.id, draft.trim());
                      setIsEditing(false);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={!draft.trim() || isSaving}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save & regenerate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(message.content);
                    setIsEditing(false);
                  }}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-stone-100 dark:hover:bg-stone-900 disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[var(--text-secondary)] whitespace-pre-wrap">
              {message.content}
            </div>
          )
        ) : (
          renderStructuredContent()
        )}
      </div>
    </div>
  );
}
