'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Conflict {
  description: string;
  doc_a: { name: string; page?: number };
  doc_b: { name: string; page?: number };
  value_a: string;
  value_b: string;
}

interface ConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: Conflict[];
  onResolve: (docName: string) => void;
}

export function ConflictDialog({
  isOpen,
  onClose,
  conflicts,
  onResolve,
}: ConflictDialogProps) {
  if (conflicts.length === 0) return null;

  const conflict = conflicts[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conflicting Information">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            The documents contain conflicting information. Please select which
            source should be considered authoritative.
          </p>
        </div>

        <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-4">
          {conflict.description}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {conflict.doc_a.name}
              {conflict.doc_a.page && ` (Page ${conflict.doc_a.page})`}
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              {conflict.value_a}
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {conflict.doc_b.name}
              {conflict.doc_b.page && ` (Page ${conflict.doc_b.page})`}
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              {conflict.value_b}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => onResolve(conflict.doc_a.name)}
          >
            Use {conflict.doc_a.name}
          </Button>
          <Button onClick={() => onResolve(conflict.doc_b.name)}>
            Use {conflict.doc_b.name}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
