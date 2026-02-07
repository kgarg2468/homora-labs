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
          'w-full px-4 py-3 pr-12 rounded-xl border resize-none transition-all duration-200',
          'bg-[var(--background)]',
          'border-[var(--border)]',
          'text-[var(--text-primary)]',
          'placeholder:text-[var(--text-muted)]',
          'focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500',
          'disabled:opacity-50'
        )}
      />
      <button
        onClick={handleSend}
        disabled={!message.trim() || isLoading}
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200',
          message.trim() && !isLoading
            ? 'bg-accent-600 text-white hover:bg-accent-700'
            : 'bg-stone-100 dark:bg-stone-900 text-[var(--text-muted)]'
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>

      <p className="mt-2 text-[10px] font-mono text-[var(--text-muted)] text-center">
        Press <kbd className="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-md">Enter</kbd> to send,{' '}
        <kbd className="px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-md">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
