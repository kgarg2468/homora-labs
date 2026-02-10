'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Settings,
  Trash2,
  MessageSquare,
  ChevronDown,
  Plus,
  Loader2,
  GitCompare,
  History,
  GitBranch,
} from 'lucide-react';
import { projectsApi, documentsApi, chatApi } from '@/lib/api';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { FollowUpSuggestions } from '@/components/chat/FollowUpSuggestions';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { UploadZone } from '@/components/documents/UploadZone';
import { SearchModal } from '@/components/search/SearchModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNotifications } from '@/hooks/useNotifications';
import type { Message, Citation, Document, Conversation, StreamEvent, DebugInfo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { DebugModal } from '@/components/chat/DebugModal';
import { DebugPanel } from '@/components/chat/DebugPanel';

export default function ProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const { registerAction, unregisterAction } = useKeyboardShortcuts();
  const { notifySuccess, notifyError, notifyIngestionComplete } = useNotifications();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPage, setViewerPage] = useState(1);
  const [showConversations, setShowConversations] = useState(false);
  const [isGeneratingBranch, setIsGeneratingBranch] = useState(false);
  const [pendingBranchSwitch, setPendingBranchSwitch] = useState<{
    conversationId: string;
    title: string;
  } | null>(null);

  // Debug UI State
  const [inspectingDebugInfo, setInspectingDebugInfo] = useState<DebugInfo | null>(null);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [activeDebugInfo, setActiveDebugInfo] = useState<DebugInfo | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const notFoundRedirectedRef = useRef(false);

  // Queries
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  });

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => documentsApi.list(projectId),
    refetchInterval: 5000, // Poll for ingestion status updates
  });

  const { data: conversationsData } = useQuery({
    queryKey: ['conversations', projectId],
    queryFn: () => chatApi.listConversations(projectId),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.upload(projectId, file),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      notifySuccess(`Uploaded ${doc.filename}`);
    },
    onError: (error) => {
      notifyError(error instanceof Error ? error.message : 'Upload failed');
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: ({ doc, mode }: { doc: Document; mode: 'soft' | 'hard' }) =>
      documentsApi.delete(projectId, doc.id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      notifySuccess('Document deleted');
    },
    onError: (error) => {
      notifyError(error instanceof Error ? error.message : 'Failed to delete document');
    },
  });

  // Register keyboard shortcuts
  useEffect(() => {
    registerAction('upload', () => uploadRef.current?.click());
    return () => unregisterAction('upload');
  }, [registerAction, unregisterAction]);

  // Redirect when a project no longer exists (for example, deleted in another tab)
  useEffect(() => {
    if (!projectError || notFoundRedirectedRef.current) return;

    const message = projectError instanceof Error ? projectError.message : '';
    const isNotFound =
      message.includes('Project not found') || message.includes('API error: 404');

    if (!isNotFound) return;

    notFoundRedirectedRef.current = true;
    notifyError('Project not found or was deleted');
    router.replace('/');
  }, [projectError, notifyError, router]);

  // Scroll to bottom when messages change (optimized for streaming)
  useEffect(() => {
    const scrollToBottom = () => {
      if (!messagesEndRef.current) return;

      const container = messagesEndRef.current.parentElement;
      if (!container) return;

      // Only auto-scroll if user is near the bottom (within 100px)
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;

      if (isNearBottom) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
        });
      }
    };

    scrollToBottom();
  }, [messages, streamingContent]);

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    // Add user message to UI immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      citations: null,
      suggested_followups: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // Use streaming endpoint
      let fullContent = '';
      let newConversationId = conversationId;
      let lastEvent: StreamEvent | null = null;

      for await (const event of chatApi.streamMessage(
        projectId,
        content,
        conversationId || undefined
      )) {
        lastEvent = event;

        if (event.type === 'error') {
          throw new Error(event.content || 'An error occurred while generating a response');
        } else if (event.type === 'token') {
          fullContent += event.content;
          setStreamingContent(fullContent);
        } else if (event.type === 'complete') {
          // Create assistant message from complete event
          const assistantMessage: Message = {
            id: event.message_id,
            role: 'assistant',
            content: fullContent,
            citations: event.citations,
            suggested_followups: event.suggested_followups,
            debug_info: event.debug_info,
            created_at: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingContent('');

          // Update conversation ID from the response
          if (event.conversation_id) {
            setConversationId(event.conversation_id);
            newConversationId = event.conversation_id;
          }

          // Refresh conversation list
          queryClient.invalidateQueries({
            queryKey: ['conversations', projectId],
          });
        }
      }

      // If stream ended without a complete event but we have content, save it anyway
      if (fullContent && lastEvent?.type !== 'complete') {
        const assistantMessage: Message = {
          id: `incomplete-${Date.now()}`,
          role: 'assistant',
          content: fullContent,
          citations: null,
          suggested_followups: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent('');
      }
    } catch (error) {
      console.error('Chat stream error:', error);
      notifyError('Failed to send message');
      // Remove the temporary user message
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  // Handle citation click
  const handleCitationClick = (citation: Citation) => {
    const doc = documentsData?.documents.find(
      (d) => d.id === citation.document_id
    );
    if (doc) {
      setSelectedDocument(doc);
      setViewerPage(citation.page || 1);
      setViewerOpen(true);
    }
  };

  // Handle file upload
  const handleUpload = (files: File[]) => {
    files.forEach((file) => uploadMutation.mutate(file));
  };

  // Load conversation
  const loadConversation = async (conv: Conversation) => {
    setConversationId(conv.id);
    const fullConv = await chatApi.getConversation(projectId, conv.id);
    setMessages(fullConv.messages);
    setCurrentConversation(fullConv);
    setShowConversations(false);
    setPendingBranchSwitch(null);
  };

  // Start new conversation
  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setCurrentConversation(null);
    setShowConversations(false);
    setPendingBranchSwitch(null);
  };

  const handleDeleteConversation = async (
    conv: Conversation,
    mode: 'soft' | 'hard'
  ) => {
    try {
      await chatApi.deleteConversation(projectId, conv.id, mode);
      if (conversationId === conv.id) {
        setConversationId(null);
        setMessages([]);
      }
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
      notifySuccess(
        mode === 'soft' ? 'Conversation moved to trash' : 'Conversation deleted'
      );
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : 'Failed to delete conversation'
      );
    }
  };

  const handleEditUserMessage = async (messageId: string, newContent: string) => {
    if (!conversationId) return;
    setIsGeneratingBranch(true);
    try {
      const result = await chatApi.editAndRegenerate(
        projectId,
        conversationId,
        messageId,
        newContent
      );
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
      setPendingBranchSwitch({
        conversationId: result.new_conversation_id,
        title: 'Edited continuation',
      });
      notifySuccess('New branch generated. Switch when ready.');
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : 'Failed to regenerate branch'
      );
      throw error;
    } finally {
      setIsGeneratingBranch(false);
    }
  };

  useEffect(() => {
    const requestedConversation = searchParams.get('conversation');
    if (!requestedConversation || !conversationsData?.conversations.length) return;
    if (conversationId === requestedConversation) return;

    const conv = conversationsData.conversations.find((c) => c.id === requestedConversation);
    if (!conv) return;
    loadConversation(conv).catch(() => {
      notifyError('Unable to load requested conversation');
    });
  }, [searchParams, conversationsData, conversationId]);

  // Get last message's suggestions
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant');

  // Debug handlers
  const handleInspect = (debugInfo: DebugInfo) => {
    setInspectingDebugInfo(debugInfo);
  };

  const handleOpenInSidebar = () => {
    if (inspectingDebugInfo) {
      setActiveDebugInfo(inspectingDebugInfo);
      setIsDebugPanelOpen(true);
      setInspectingDebugInfo(null); // Close modal
    }
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <PanelGroup orientation="horizontal" className="flex-1">
        {/* Left Sidebar - Documents */}
        <Panel defaultSize="20" minSize="15" maxSize="30" className="flex flex-col border-r border-[var(--border)] bg-[var(--surface-elevated)]">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[var(--border)]">
            <Link
              href="/"
              className="flex items-center gap-2 text-[var(--text-muted)] hover:text-accent-600 dark:hover:text-accent-400 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Projects</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 dark:bg-stone-900 rounded-lg">
                <Building2 className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-serif text-[var(--text-primary)] truncate">
                  {project?.name}
                </h1>
                <Badge size="sm">{project?.role_mode}</Badge>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="uppercase text-[11px] tracking-widest font-medium text-[var(--text-muted)]">
                Documents
              </h2>
              <span className="text-xs text-[var(--text-muted)]">
                {documentsData?.total || 0}
              </span>
            </div>

            <UploadZone
              onUpload={handleUpload}
              isUploading={uploadMutation.isPending}
              compact
            />

            <div className="mt-4">
              <DocumentList
                documents={documentsData?.documents || []}
                selectedId={selectedDocument?.id}
                onSelect={(doc) => {
                  setSelectedDocument(doc);
                  setViewerOpen(true);
                }}
                onDelete={(doc, mode) => deleteMutation.mutate({ doc, mode })}
                onReprocess={(doc) =>
                  documentsApi.reprocess(projectId, doc.id).then(() => {
                    queryClient.invalidateQueries({
                      queryKey: ['documents', projectId],
                    });
                  })
                }
              />
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[var(--border)] space-y-2">
            <Link
              href={`/projects/${projectId}/history?view=trash`}
              className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Trash
            </Link>
            <Link
              href={`/projects/${projectId}/history`}
              className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
            >
              <History className="w-4 h-4" />
              History
            </Link>
            <Link
              href={`/projects/${projectId}/compare`}
              className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
            >
              <GitCompare className="w-4 h-4" />
              Compare Documents
            </Link>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-[var(--border)] hover:bg-accent-500 transition-colors cursor-col-resize" />

        {/* Main Content - Chat */}
        <Panel defaultSize={isDebugPanelOpen ? "60" : "80"} className="flex flex-col">
          {/* Top Bar */}
          <header className="h-14 px-4 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Conversation selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowConversations(!showConversations)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {conversationId ? 'Current Session' : 'New Conversation'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                </button>

                {showConversations && (
                  <div className="absolute top-full left-0 mt-1 w-80 max-h-[420px] overflow-auto bg-[var(--surface)] rounded-lg shadow-warm-lg border border-[var(--border)] py-2 z-10">
                    <button
                      type="button"
                      onClick={startNewConversation}
                      className="w-full px-4 py-2 text-sm text-left text-accent-600 dark:text-accent-400 hover:bg-stone-100 dark:hover:bg-stone-900 flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      New Conversation
                    </button>
                    <div className="border-t border-[var(--border)] my-1" />
                    {conversationsData?.conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          'px-3 py-2',
                          conv.id === conversationId
                            ? 'bg-accent-50 dark:bg-accent-950/20'
                            : ''
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => loadConversation(conv)}
                            className="flex-1 min-w-0 text-left rounded-md px-2 py-1 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
                          >
                            <div className="font-medium text-[var(--text-secondary)] truncate text-sm">
                              {conv.title || 'Untitled'}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              {new Date(conv.updated_at).toLocaleString()}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConversation(conv, 'soft')}
                            className="px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:text-accent-600 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
                            title="Move to trash"
                          >
                            Trash
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConversation(conv, 'hard')}
                            className="px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:text-[#B85450] hover:bg-[#B85450]/5 transition-colors"
                            title="Delete permanently"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </header>

          {/* Chat Messages */}
          <div className="flex-1 overflow-auto p-4">
            {isGeneratingBranch && (
              <div className="max-w-3xl mx-auto mb-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin text-accent-500" />
                Generating new branch from your edit...
              </div>
            )}

            {pendingBranchSwitch && (
              <div className="max-w-3xl mx-auto mb-4 p-3 rounded-lg border border-accent-300 bg-accent-50 dark:bg-accent-950/15 flex items-center justify-between gap-3">
                <div className="text-sm text-[var(--text-secondary)]">
                  New continuation generated from your edit.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const conv = conversationsData?.conversations.find(
                        (item) => item.id === pendingBranchSwitch.conversationId
                      );
                      if (conv) {
                        await loadConversation(conv);
                      } else {
                        const fullConv = await chatApi.getConversation(
                          projectId,
                          pendingBranchSwitch.conversationId
                        );
                        setConversationId(fullConv.id);
                        setCurrentConversation(fullConv);
                        setMessages(fullConv.messages);
                      }
                      setPendingBranchSwitch(null);
                    }}
                    className="px-2 py-1 text-xs rounded-md bg-accent-600 text-white hover:bg-accent-700"
                  >
                    Switch
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingBranchSwitch(null)}
                    className="px-2 py-1 text-xs rounded-md border border-[var(--border)] hover:bg-stone-100 dark:hover:bg-stone-900"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {messages.length === 0 && !isStreaming ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 mx-auto mb-4 bg-accent-100 dark:bg-accent-950/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-accent-500" />
                  </div>
                  <h2 className="font-serif text-2xl text-[var(--text-primary)] mb-2">
                    Ask a Question
                  </h2>
                  <p className="text-[var(--text-muted)] text-base">
                    Start by asking a question about your documents. Homora will
                    analyze them and provide answers with citations.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message) => {
                  const branchMarker = currentConversation?.branch_markers?.find(
                    (marker) => marker.message_id === message.id
                  );

                  return (
                    <div key={message.id} className="space-y-2">
                      <ChatMessage
                        message={message}
                        onCitationClick={handleCitationClick}
                        onInspect={handleInspect}
                        onEditUserMessage={handleEditUserMessage}
                        isEditingDisabled={isStreaming || isGeneratingBranch}
                      />
                      {branchMarker && (
                        <div className="ml-12 inline-flex items-center gap-2 text-xs text-[var(--text-muted)] px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)]">
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>{branchMarker.count} alternate continuations</span>
                          {branchMarker.branch_conversation_ids[0] && (
                            <button
                              type="button"
                              onClick={async () => {
                                const conv = conversationsData?.conversations.find(
                                  (item) => item.id === branchMarker.branch_conversation_ids[0]
                                );
                                if (conv) {
                                  await loadConversation(conv);
                                }
                              }}
                              className="text-accent-600 hover:underline"
                            >
                              Open
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Streaming message */}
                {isStreaming && streamingContent && (
                  <div className="flex gap-4 p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--surface-elevated)]">
                      <Loader2 className="w-4 h-4 text-accent-500 animate-spin" />
                    </div>
                    <div className="flex-1 prose whitespace-pre-wrap">
                      {streamingContent}
                    </div>
                  </div>
                )}

                {/* Typing indicator */}
                {isStreaming && !streamingContent && (
                  <div className="flex gap-4 p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--surface-elevated)]">
                      <Loader2 className="w-4 h-4 text-accent-500 animate-spin" />
                    </div>
                    <div className="typing-indicator pt-3">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Follow-up suggestions */}
          {lastAssistantMessage?.suggested_followups && (
            <div className="px-4 pb-2">
              <div className="max-w-3xl mx-auto">
                <FollowUpSuggestions
                  suggestions={lastAssistantMessage.suggested_followups}
                  onSelect={handleSendMessage}
                />
              </div>
            </div>
          )}

          {/* Chat Input */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
            <div className="max-w-3xl mx-auto">
              <ChatInput
                onSend={handleSendMessage}
                isLoading={isStreaming || isGeneratingBranch}
              />
            </div>
          </div>
        </Panel>

        {/* Right Sidebar - Debug Info */}
        {isDebugPanelOpen && activeDebugInfo && (
          <>
            <PanelResizeHandle className="w-1 bg-[var(--border)] hover:bg-accent-500 transition-colors cursor-col-resize" />
            <Panel defaultSize="20" minSize="20" maxSize="50">
              <DebugPanel debugInfo={activeDebugInfo} className="h-full border-l border-[var(--border)]" />
            </Panel>
          </>
        )}
      </PanelGroup>

      {/* Modals */}
      <DebugModal
        isOpen={!!inspectingDebugInfo}
        onClose={() => setInspectingDebugInfo(null)}
        debugInfo={inspectingDebugInfo}
        onOpenInSidebar={handleOpenInSidebar}
      />


      {/* Document Viewer Modal */}
      <DocumentViewer
        document={selectedDocument}
        initialPage={viewerPage}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />

      <SearchModal />
    </div>
  );
}
