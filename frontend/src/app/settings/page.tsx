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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
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
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  LLM Provider
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Configure your AI model provider
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                        'p-3 rounded-lg border text-sm font-medium transition-colors',
                        (provider || settings.llm.provider) === p
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Model
                </label>
                <select
                  value={model || settings?.llm.model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                <Key className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  API Keys
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Leave blank to keep existing key. Keys are encrypted before storage.
              </p>
            </div>
          </section>

          {/* Embeddings Section */}
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Embedding Model
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Appearance
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Customize the look and feel
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 dark:text-slate-300">
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
