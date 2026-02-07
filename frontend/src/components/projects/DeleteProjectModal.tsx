'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Project } from '@/lib/types';

interface DeleteProjectModalProps {
  isOpen: boolean;
  project: Project | null;
  isDeleting: boolean;
  apiError: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteProjectModal({
  isOpen,
  project,
  isDeleting,
  apiError,
  onClose,
  onConfirm,
}: DeleteProjectModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Project" size="sm">
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This will permanently delete <span className="font-semibold">{project?.name ?? 'this project'}</span>.
        </p>

        <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 space-y-1 text-sm text-red-700 dark:text-red-300">
          <p>{project?.document_count ?? 0} document(s) will be deleted.</p>
          <p>All related conversations will also be deleted.</p>
        </div>

        {apiError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {apiError}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" isLoading={isDeleting} onClick={onConfirm}>
            Delete Project
          </Button>
        </div>
      </div>
    </Modal>
  );
}
