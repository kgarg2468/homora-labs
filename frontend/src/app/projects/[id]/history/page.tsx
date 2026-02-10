'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, MessageSquare, Trash2, RotateCcw } from 'lucide-react';
import { projectsApi, chatApi, documentsApi } from '@/lib/api';
import type { Conversation, Document, TrashItem } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

type TimelineItem =
  | { kind: 'conversation'; id: string; title: string; createdAt: string; deletedAt?: string | null }
  | { kind: 'document'; id: string; title: string; createdAt: string; deletedAt?: string | null };

function getDateGroupLabel(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Last 7 Days';
  return 'Older';
}

export default function ProjectHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const trashOnly = searchParams.get('view') === 'trash';
  const { notifySuccess, notifyError } = useNotifications();

  // State for tracking pending mutations and confirmation dialog
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<{ id: string; kind: 'conversation' | 'document'; title: string } | null>(null);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  });

  const { data: conversationsData } = useQuery({
    queryKey: ['conversations', projectId, 'history'],
    queryFn: () => chatApi.listConversations(projectId),
  });

  const { data: documentsData } = useQuery({
    queryKey: ['documents', projectId, 'history'],
    queryFn: () => documentsApi.list(projectId),
  });

  const { data: trashData } = useQuery({
    queryKey: ['trash', projectId],
    queryFn: () => projectsApi.getTrash(projectId),
  });

  const restoreConversationMutation = useMutation({
    mutationFn: (conversationId: string) => chatApi.restoreConversation(projectId, conversationId),
    onMutate: (conversationId) => {
      setPendingItemId(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash', projectId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId, 'history'] });
      notifySuccess('Conversation restored successfully');
    },
    onError: (error) => {
      notifyError(error instanceof Error ? error.message : 'Failed to restore conversation');
    },
    onSettled: () => {
      setPendingItemId(null);
    },
  });

  const purgeConversationMutation = useMutation({
    mutationFn: (conversationId: string) => chatApi.purgeConversation(projectId, conversationId),
    onMutate: (conversationId) => {
      setPendingItemId(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash', projectId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId, 'history'] });
      notifySuccess('Conversation permanently deleted');
    },
    onError: (error) => {
      notifyError(error instanceof Error ? error.message : 'Failed to delete conversation');
    },
    onSettled: () => {
      setPendingItemId(null);
    },
  });

  const restoreDocumentMutation = useMutation({
    mutationFn: (documentId: string) => documentsApi.restore(projectId, documentId),
    onMutate: (documentId) => {
      setPendingItemId(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash', projectId] });
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['documents', projectId, 'history'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      notifySuccess('Document restored successfully');
    },
    onError: (error) => {
      notifyError(error instanceof Error ? error.message : 'Failed to restore document');
    },
    onSettled: () => {
      setPendingItemId(null);
    },
  });

  const purgeDocumentMutation = useMutation({
    mutationFn: (documentId: string) => documentsApi.purge(projectId, documentId),
    onMutate: (documentId) => {
      setPendingItemId(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash', projectId] });
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['documents', projectId, 'history'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      notifySuccess('Document permanently deleted');
    },
    onError: (error) => {
      notifyError(error instanceof Error ? error.message : 'Failed to delete document');
    },
    onSettled: () => {
      setPendingItemId(null);
    },
  });

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    if (!trashOnly) {
      (conversationsData?.conversations || []).forEach((conversation: Conversation) => {
        items.push({
          kind: 'conversation',
          id: conversation.id,
          title: conversation.title || 'Untitled conversation',
          createdAt: conversation.created_at,
          deletedAt: null,
        });
      });

      (documentsData?.documents || []).forEach((document: Document) => {
        items.push({
          kind: 'document',
          id: document.id,
          title: document.filename,
          createdAt: document.created_at,
          deletedAt: null,
        });
      });
    }

    (trashData?.items || []).forEach((trashItem: TrashItem) => {
      items.push({
        kind: trashItem.type,
        id: trashItem.id,
        title: trashItem.title,
        createdAt: trashItem.created_at,
        deletedAt: trashItem.deleted_at,
      });
    });

    items.sort((a, b) => {
      const aDate = new Date(a.deletedAt || a.createdAt).getTime();
      const bDate = new Date(b.deletedAt || b.createdAt).getTime();
      return bDate - aDate;
    });

    return items;
  }, [trashOnly, conversationsData, documentsData, trashData]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {};
    for (const item of timeline) {
      const group = getDateGroupLabel(item.deletedAt || item.createdAt);
      groups[group] = groups[group] || [];
      groups[group].push(item);
    }
    return groups;
  }, [timeline]);

  const groupOrder = ['Today', 'Yesterday', 'Last 7 Days', 'Older'];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-accent-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Project
            </Link>
            <h1 className="font-serif text-3xl text-[var(--text-primary)]">
              {project?.name} History
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {trashOnly ? 'Trash items' : 'Conversations and documents timeline'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/projects/${projectId}/history`}>
              <Button variant={trashOnly ? 'outline' : 'primary'} size="sm">
                All
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/history?view=trash`}>
              <Button variant={trashOnly ? 'primary' : 'outline'} size="sm">
                Trash
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {groupOrder.map((group) => {
            const items = groupedItems[group] || [];
            if (items.length === 0) return null;

            return (
              <section key={group}>
                <h2 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  {group}
                </h2>
                <div className="space-y-2">
                  {items.map((item) => {
                    const isDeleted = Boolean(item.deletedAt);
                    return (
                      <div
                        key={`${item.kind}-${item.id}-${item.deletedAt || item.createdAt}`}
                        className={cn(
                          'p-3 rounded-lg border flex items-center justify-between gap-3 relative overflow-hidden',
                          isDeleted
                            ? 'bg-[#B85450]/5 border-[#B85450]/30'
                            : 'bg-[var(--surface)] border-[var(--border)]'
                        )}
                      >
                        {/* Skeleton loading overlay */}
                        {pendingItemId === item.id && (
                          <div className="absolute inset-0 bg-[var(--surface)]/80 animate-pulse rounded-lg z-10 flex items-center justify-center">
                            <span className="text-sm text-[var(--text-muted)]">Processing...</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {item.kind === 'conversation' ? (
                              <MessageSquare className="w-4 h-4 text-[var(--text-muted)]" />
                            ) : (
                              <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {item.title}
                            </span>
                            {isDeleted && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#B85450]/15 text-[#B85450]">
                                Deleted
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {isDeleted
                              ? `Deleted ${new Date(item.deletedAt!).toLocaleString()}`
                              : `Created ${new Date(item.createdAt).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isDeleted && item.kind === 'conversation' && (
                            <Link href={`/projects/${projectId}?conversation=${item.id}`}>
                              <Button variant="outline" size="sm">
                                Open
                              </Button>
                            </Link>
                          )}
                          {!isDeleted && item.kind === 'document' && (
                            <Link href={`/projects/${projectId}`}>
                              <Button variant="outline" size="sm">
                                Open
                              </Button>
                            </Link>
                          )}

                          {isDeleted && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (item.kind === 'conversation') {
                                    restoreConversationMutation.mutate(item.id);
                                  } else {
                                    restoreDocumentMutation.mutate(item.id);
                                  }
                                }}
                                leftIcon={<RotateCcw className="w-4 h-4" />}
                                disabled={pendingItemId === item.id}
                              >
                                Restore
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setConfirmPurge({ id: item.id, kind: item.kind, title: item.title });
                                }}
                                leftIcon={<Trash2 className="w-4 h-4" />}
                                disabled={pendingItemId === item.id}
                              >
                                Delete Permanently
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog for permanent delete */}
      <ConfirmDialog
        open={!!confirmPurge}
        onClose={() => setConfirmPurge(null)}
        onConfirm={() => {
          if (confirmPurge) {
            if (confirmPurge.kind === 'conversation') {
              purgeConversationMutation.mutate(confirmPurge.id);
            } else {
              purgeDocumentMutation.mutate(confirmPurge.id);
            }
            setConfirmPurge(null);
          }
        }}
        title="Delete Permanently?"
        description={`"${confirmPurge?.title || 'This item'}" will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={purgeConversationMutation.isPending || purgeDocumentMutation.isPending}
      />
    </div>
  );
}
