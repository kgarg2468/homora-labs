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
        <p className="text-sm text-[var(--text-secondary)]">
          This will permanently delete <span className="font-semibold">{project?.name ?? 'this project'}</span>.
        </p>

        <div className="rounded-lg border border-[#B85450]/30 bg-[#B85450]/5 dark:bg-[#B85450]/10 p-3 space-y-1 text-sm text-[#B85450]">
          <p>{project?.document_count ?? 0} document(s) will be deleted.</p>
          <p>All related conversations will also be deleted.</p>
        </div>

        {apiError && (
          <p className="text-sm text-[#B85450]" role="alert">
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
