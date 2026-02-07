'use client';

import { useState } from 'react';
import { Clock, Cpu, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DebugInfo } from '@/lib/types';

interface DebugPanelProps {
    debugInfo: DebugInfo;
    className?: string;
    showHeader?: boolean;
}

export function DebugPanel({ debugInfo, className, showHeader = true }: DebugPanelProps) {
    const [activeTab, setActiveTab] = useState<'chunks' | 'prompts'>('chunks');
    const supportLabel = (value?: number | null) => {
        if (value === null || value === undefined) return 'Support N/A';
        const pct = (value * 100).toFixed(0);
        if (value >= 0.75) return `Support High (${pct}%)`;
        if (value >= 0.55) return `Support Medium (${pct}%)`;
        return `Support Low (${pct}%)`;
    };

    return (
        <div className={cn("flex flex-col h-full", className)} style={{ backgroundColor: 'var(--background)' }}>
            {/* Header with stats */}
            {showHeader && (
                <div className="flex items-center gap-4 px-4 py-2 bg-[var(--surface-elevated)] border-b border-[var(--border)] shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{debugInfo.execution_time_ms.toFixed(0)}ms</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>{debugInfo.llm_model}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{debugInfo.retrieved_chunks.length} chunks</span>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] shrink-0">
                <button
                    onClick={() => setActiveTab('chunks')}
                    className={cn(
                        'px-4 py-2 text-xs font-medium transition-colors flex-1 text-center',
                        activeTab === 'chunks'
                            ? 'text-accent-600 dark:text-accent-400 border-b-2 border-accent-600 dark:border-accent-400 bg-[var(--surface)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    )}
                >
                    Retrieved Chunks
                </button>
                <button
                    onClick={() => setActiveTab('prompts')}
                    className={cn(
                        'px-4 py-2 text-xs font-medium transition-colors flex-1 text-center',
                        activeTab === 'prompts'
                            ? 'text-accent-600 dark:text-accent-400 border-b-2 border-accent-600 dark:border-accent-400 bg-[var(--surface)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    )}
                >
                    Prompts
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'chunks' && (
                    <div className="space-y-3">
                        {debugInfo.retrieved_chunks.map((chunk, idx) => (
                            <div
                                key={idx}
                                className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                                        {chunk.document_name}
                                        {chunk.page_number && ` · p.${chunk.page_number}`}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {chunk.retrieval_rank && (
                                            <span className="px-2 py-0.5 text-xs font-mono rounded-md bg-stone-100 dark:bg-stone-900 text-[var(--text-muted)]">
                                                #{chunk.retrieval_rank}
                                            </span>
                                        )}
                                        <span
                                            className={cn(
                                                'px-2 py-0.5 text-xs font-mono rounded-md',
                                                (chunk.answer_support ?? 0) >= 0.75
                                                    ? 'bg-[#5E8C61]/10 text-[#5E8C61] dark:bg-[#5E8C61]/15 dark:text-[#7DA97F]'
                                                    : (chunk.answer_support ?? 0) >= 0.55
                                                        ? 'bg-[#C4973B]/10 text-[#C4973B] dark:bg-[#C4973B]/15 dark:text-[#D4A74B]'
                                                        : 'bg-stone-100 dark:bg-stone-900 text-[var(--text-muted)]'
                                            )}
                                        >
                                            {supportLabel(chunk.answer_support)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 text-xs rounded-md bg-[var(--surface-elevated)] text-[var(--text-muted)]">
                                        Retrieval: {chunk.retrieval_relevance != null ? `${(chunk.retrieval_relevance * 100).toFixed(0)}%` : 'N/A'}
                                    </span>
                                    <span className="px-2 py-0.5 text-xs rounded-md bg-[var(--surface-elevated)] text-[var(--text-muted)]">
                                        Cited: {chunk.cited_in_answer ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
                                    {chunk.content}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'prompts' && (
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 sticky top-0 py-1" style={{ backgroundColor: 'var(--background)' }}>
                                System Prompt
                            </h4>
                            <div className="relative group">
                                <pre className="text-xs text-[var(--text-secondary)] bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)] whitespace-pre-wrap overflow-x-auto">
                                    {debugInfo.system_prompt}
                                </pre>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 sticky top-0 py-1" style={{ backgroundColor: 'var(--background)' }}>
                                User Prompt (with context)
                            </h4>
                            <pre className="text-xs text-[var(--text-secondary)] bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)] whitespace-pre-wrap overflow-x-auto">
                                {debugInfo.user_prompt}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
