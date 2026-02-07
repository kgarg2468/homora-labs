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
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 resize-none transition-all duration-200"
            placeholder="Brief description of the project..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
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
                  'p-4 rounded-lg border text-left transition-all duration-200',
                  roleMode === option.value
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/20'
                    : 'border-[var(--border)] hover:border-[var(--text-muted)]'
                )}
                aria-pressed={roleMode === option.value}
              >
                <div className="font-medium text-[var(--text-primary)]">
                  {option.label}
                </div>
                <div className="text-sm text-[var(--text-muted)] mt-1">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {apiError && (
          <p className="text-sm text-[#B85450]" role="alert">
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
