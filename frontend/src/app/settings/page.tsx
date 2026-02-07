'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Key,
  Palette,
  Database,
  Save,
  Loader2,
  Check,
} from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { notifySuccess, notifyError } = useNotifications();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const [provider, setProvider] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [embeddingModel, setEmbeddingModel] = useState<string>('');

  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      setProvider(settings.llm.provider);
      setModel(settings.llm.model);
      setEmbeddingModel(settings.embedding.model);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      notifySuccess('Settings saved');
      setApiKey('');
    },
    onError: () => {
      notifyError('Failed to save settings');
    },
  });

  const handleSave = () => {
    const updates: any = {};

    if (provider || model || apiKey) {
      updates.llm = {
        provider: provider || settings?.llm.provider,
        model: model || settings?.llm.model,
        ...(apiKey && { api_key: apiKey }),
      };
    }

    if (embeddingModel) {
      updates.embedding = { model: embeddingModel };
    }

    updateMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-100 dark:bg-stone-900 rounded-lg">
                  <Building2 className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <h1 className="text-lg font-serif text-[var(--text-primary)]">
                  Settings
                </h1>
              </div>
            </div>

            <Button
              onClick={handleSave}
              isLoading={updateMutation.isPending}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* LLM Provider Section */}
          <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#5B7B9A]/10 rounded-lg">
                <Database className="w-5 h-5 text-[#5B7B9A]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  LLM Provider
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Configure your AI model provider
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Provider
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {settings?.available_providers.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setProvider(p);
                        // Reset model when provider changes
                        setModel(settings.available_models[p]?.[0] || '');
                      }}
                      className={cn(
                        'p-3 rounded-lg border text-sm font-medium transition-all duration-200',
                        (provider || settings.llm.provider) === p
                          ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/20 text-accent-700 dark:text-accent-400'
                          : 'border-[var(--border)] hover:border-[var(--text-muted)] text-[var(--text-secondary)]'
                      )}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Model
                </label>
                <select
                  value={model || settings?.llm.model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all duration-200"
                >
                  {settings?.available_models[provider || settings.llm.provider]?.map(
                    (m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* API Keys Section */}
          <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#C4973B]/10 rounded-lg">
                <Key className="w-5 h-5 text-[#C4973B]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  API Keys
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Manage your provider API keys (stored encrypted)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label={`${(provider || settings?.llm.provider || 'Provider').charAt(0).toUpperCase() + (provider || settings?.llm.provider || 'provider').slice(1)} API Key`}
                type="password"
                placeholder="Enter API key to update"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-[var(--text-muted)]">
                Leave blank to keep existing key. Keys are encrypted before storage.
              </p>
            </div>
          </section>

          {/* Embeddings Section */}
          <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#5E8C61]/10 rounded-lg">
                <Database className="w-5 h-5 text-[#5E8C61]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Embedding Model
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Model used for document vectorization
                </p>
              </div>
            </div>

            <Input
              value={embeddingModel || settings?.embedding.model}
              onChange={(e) => setEmbeddingModel(e.target.value)}
              placeholder="text-embedding-3-small"
            />
          </section>

          {/* Theme Section */}
          <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#8B6B94]/10 rounded-lg">
                <Palette className="w-5 h-5 text-[#8B6B94]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Appearance
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Customize the look and feel
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">
                Theme
              </span>
              <ThemeToggle showLabel />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
