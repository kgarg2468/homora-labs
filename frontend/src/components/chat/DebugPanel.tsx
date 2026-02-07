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

    return (
        <div className={cn("flex flex-col h-full bg-slate-50 dark:bg-slate-900", className)}>
            {/* Header with stats */}
            {showHeader && (
                <div className="flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
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
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0">
                <button
                    onClick={() => setActiveTab('chunks')}
                    className={cn(
                        'px-4 py-2 text-xs font-medium transition-colors flex-1 text-center',
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
                        'px-4 py-2 text-xs font-medium transition-colors flex-1 text-center',
                        activeTab === 'prompts'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-800'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
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
                                <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                    {chunk.content}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'prompts' && (
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 sticky top-0 bg-slate-50 dark:bg-slate-900 py-1">
                                System Prompt
                            </h4>
                            <div className="relative group">
                                <pre className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap overflow-x-auto">
                                    {debugInfo.system_prompt}
                                </pre>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 sticky top-0 bg-slate-50 dark:bg-slate-900 py-1">
                                User Prompt (with context)
                            </h4>
                            <pre className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap overflow-x-auto">
                                {debugInfo.user_prompt}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
