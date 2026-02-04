'use client';

import { User, Bot } from 'lucide-react';
import type { Message, Citation } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (citation: Citation) => void;
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

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
            <div key={key}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {header.replace(/\*\*/g, '')}
              </h3>
              <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
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
        'flex gap-4 p-4 rounded-xl message-enter',
        isUser
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-primary-600 text-white'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {isUser ? 'You' : 'Homora'}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {formatDateTime(message.created_at)}
          </span>
        </div>

        {isUser ? (
          <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          renderStructuredContent()
        )}
      </div>
    </div>
  );
}
