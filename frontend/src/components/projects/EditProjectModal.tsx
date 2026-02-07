'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Project, RoleMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EditProjectModalProps {
  isOpen: boolean;
  project: Project | null;
  isSubmitting: boolean;
  apiError: string | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; role_mode: RoleMode }) => void;
}

export function EditProjectModal({
  isOpen,
  project,
  isSubmitting,
  apiError,
  onClose,
  onSubmit,
}: EditProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleMode, setRoleMode] = useState<RoleMode>('plain');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !project) return;

    setName(project.name);
    setDescription(project.description ?? '');
    setRoleMode(project.role_mode);
    setNameError(null);
  }, [isOpen, project]);

  const trimmedName = useMemo(() => name.trim(), [name]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedName) {
      setNameError('Project name is required');
      return;
    }

    if (trimmedName.length > 255) {
      setNameError('Project name must be 255 characters or fewer');
      return;
    }

    setNameError(null);
    onSubmit({ name: trimmedName, description: description.trim(), role_mode: roleMode });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Project" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Project Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={nameError ?? undefined}
          maxLength={255}
          required
          autoFocus
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent resize-none"
            placeholder="Brief description of the project..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Response Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: 'plain' as const,
                label: 'Plain',
                description: 'Clear, everyday language',
              },
              {
                value: 'analytical' as const,
                label: 'Analytical',
                description: 'Technical terminology',
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRoleMode(option.value)}
                className={cn(
                  'p-4 rounded-lg border text-left transition-colors',
                  roleMode === option.value
                    ? 'border-slate-500 bg-slate-100 dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                )}
                aria-pressed={roleMode === option.value}
              >
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {option.label}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {apiError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {apiError}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
