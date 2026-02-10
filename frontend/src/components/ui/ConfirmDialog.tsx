'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'default';
    isLoading?: boolean;
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
    isLoading = false,
}: ConfirmDialogProps) {
    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform rounded-xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-warm-xl transition-all">
                                <div className="flex items-start gap-4">
                                    <div
                                        className={cn(
                                            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                                            variant === 'danger'
                                                ? 'bg-[#B85450]/10'
                                                : 'bg-accent-100 dark:bg-accent-950/20'
                                        )}
                                    >
                                        <AlertTriangle
                                            className={cn(
                                                'w-5 h-5',
                                                variant === 'danger' ? 'text-[#B85450]' : 'text-accent-600'
                                            )}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Dialog.Title className="text-lg font-medium text-[var(--text-primary)]">
                                            {title}
                                        </Dialog.Title>
                                        <Dialog.Description className="mt-1 text-sm text-[var(--text-muted)]">
                                            {description}
                                        </Dialog.Description>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-shrink-0 p-1 rounded-md text-[var(--text-muted)] hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="mt-6 flex items-center justify-end gap-3">
                                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                                        {cancelText}
                                    </Button>
                                    <Button
                                        variant={variant === 'danger' ? 'danger' : 'primary'}
                                        onClick={onConfirm}
                                        isLoading={isLoading}
                                    >
                                        {confirmText}
                                    </Button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
