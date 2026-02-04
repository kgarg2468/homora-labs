'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, Save, Eye, EyeOff } from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export function SettingsPanel() {
  const queryClient = useQueryClient();
  const { notifySuccess, notifyError } = useNotifications();
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const [formData, setFormData] = useState({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: '',
    embeddingModel: 'text-embedding-3-small',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        provider: settings.llm.provider,
        model: settings.llm.model,
        apiKey: '',
        embeddingModel: settings.embedding.model,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      notifySuccess('Settings saved');
      setFormData((prev) => ({ ...prev, apiKey: '' }));
    },
    onError: () => {
      notifyError('Failed to save settings');
    },
  });

  const handleSave = () => {
    const updates: any = {
      llm: {
        provider: formData.provider,
        model: formData.model,
      },
      embedding: {
        model: formData.embeddingModel,
      },
    };

    if (formData.apiKey) {
      updates.llm.api_key = formData.apiKey;
    }

    updateMutation.mutate(updates);
  };

  if (isLoading) {
    return <div className="p-4 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          LLM Provider
        </label>
        <div className="grid grid-cols-3 gap-2">
          {settings?.available_providers.map((provider) => (
            <button
              key={provider}
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  provider,
                  model: settings.available_models[provider]?.[0] || '',
                }))
              }
              className={cn(
                'py-2 px-3 text-sm rounded-lg border transition-colors',
                formData.provider === provider
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              )}
            >
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Model
        </label>
        <select
          value={formData.model}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, model: e.target.value }))
          }
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500"
        >
          {settings?.available_models[formData.provider]?.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          API Key
        </label>
        <div className="relative">
          <Input
            type={showApiKey ? 'text' : 'password'}
            placeholder="Enter to update (leave blank to keep existing)"
            value={formData.apiKey}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, apiKey: e.target.value }))
            }
            rightIcon={
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          />
        </div>
      </div>

      {/* Embedding Model */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Embedding Model
        </label>
        <Input
          value={formData.embeddingModel}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, embeddingModel: e.target.value }))
          }
        />
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        isLoading={updateMutation.isPending}
        leftIcon={<Save className="w-4 h-4" />}
        className="w-full"
      >
        Save Settings
      </Button>
    </div>
  );
}
