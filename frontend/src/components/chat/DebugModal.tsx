'use client';

import { PanelRightOpen } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DebugPanel } from './DebugPanel';
import type { DebugInfo } from '@/lib/types';

interface DebugModalProps {
    isOpen: boolean;
    onClose: () => void;
    debugInfo: DebugInfo | null;
    onOpenInSidebar: () => void;
}

export function DebugModal({
    isOpen,
    onClose,
    debugInfo,
    onOpenInSidebar,
}: DebugModalProps) {
    if (!debugInfo) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title="RAG Pipeline Inspection"
        >
            <div className="flex flex-col h-[70vh]">
                <div className="flex justify-end px-4 pb-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            onClose();
                            onOpenInSidebar();
                        }}
                        className="text-xs gap-2"
                    >
                        <PanelRightOpen className="w-4 h-4" />
                        Open in Sidebar
                    </Button>
                </div>

                <div className="flex-1 border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700">
                    <DebugPanel debugInfo={debugInfo} showHeader={true} />
                </div>
            </div>
        </Modal>
    );
}
