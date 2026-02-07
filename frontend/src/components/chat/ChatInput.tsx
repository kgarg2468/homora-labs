'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Ask a question about your documents...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        className={cn(
          'w-full px-4 py-3 pr-12 rounded-xl border resize-none transition-colors',
          'bg-white dark:bg-slate-800',
          'border-slate-300 dark:border-slate-600',
          'text-slate-900 dark:text-slate-100',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent',
          'disabled:opacity-50'
        )}
      />
      <button
        onClick={handleSend}
        disabled={!message.trim() || isLoading}
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors',
          message.trim() && !isLoading
            ? 'bg-zinc-700 text-white hover:bg-zinc-800'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>

      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 text-center">
        Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Enter</kbd> to send,{' '}
        <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
