'use client';

import { useState } from 'react';
import { User, Bot, Bug, ChevronDown, ChevronUp, Clock, Cpu, FileText } from 'lucide-react';
import type { Message, Citation, DebugInfo } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (citation: Citation) => void;
}

function DebugInfoPanel({ debugInfo }: { debugInfo: DebugInfo }) {
  const [activeTab, setActiveTab] = useState<'chunks' | 'prompts'>('chunks');

  return (
    <div className="mt-4 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Header with stats */}
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{debugInfo.execution_time_ms.toFixed(0)}ms</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Cpu className="w-3.5 h-3.5" />
          <span>{debugInfo.llm_model}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <FileText className="w-3.5 h-3.5" />
          <span>{debugInfo.retrieved_chunks.length} chunks</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-600">
        <button
          onClick={() => setActiveTab('chunks')}
          className={cn(
            'px-4 py-2 text-xs font-medium transition-colors',
            activeTab === 'chunks'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-800'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          Retrieved Chunks
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={cn(
            'px-4 py-2 text-xs font-medium transition-colors',
            activeTab === 'prompts'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-800'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          Prompts
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {activeTab === 'chunks' && (
          <div className="space-y-3">
            {debugInfo.retrieved_chunks.map((chunk, idx) => (
              <div
                key={idx}
                className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {chunk.document_name}
                    {chunk.page_number && ` • p.${chunk.page_number}`}
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-mono rounded-full',
                      chunk.score >= 0.8
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : chunk.score >= 0.5
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    )}
                  >
                    {(chunk.score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                  {chunk.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                System Prompt
              </h4>
              <pre className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {debugInfo.system_prompt}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                User Prompt (with context)
              </h4>
              <pre className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {debugInfo.user_prompt}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [showDebug, setShowDebug] = useState(false);

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
          ? 'bg-slate-100 dark:bg-slate-800'
          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-zinc-700 text-white'
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

          {/* Inspect button for assistant messages with debug_info */}
          {!isUser && message.debug_info && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={cn(
                'ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors',
                showDebug
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700'
              )}
              title="Inspect RAG pipeline"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Inspect</span>
              {showDebug ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        {isUser ? (
          <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          renderStructuredContent()
        )}

        {/* Debug info panel */}
        {!isUser && showDebug && message.debug_info && (
          <DebugInfoPanel debugInfo={message.debug_info} />
        )}
      </div>
    </div>
  );
}

