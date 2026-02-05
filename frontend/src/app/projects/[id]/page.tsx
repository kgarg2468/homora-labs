'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Settings,
  FileText,
  MessageSquare,
  ChevronDown,
  Archive,
  Plus,
  Loader2,
  Download,
  GitCompare,
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
import type { Message, Citation, Document, Conversation, StreamEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const queryClient = useQueryClient();
  const { registerAction, unregisterAction } = useKeyboardShortcuts();
  const { notifySuccess, notifyError, notifyIngestionComplete } = useNotifications();

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPage, setViewerPage] = useState(1);
  const [showConversations, setShowConversations] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: project, isLoading: projectLoading } = useQuery({
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
    mutationFn: (doc: Document) => documentsApi.delete(projectId, doc.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      notifySuccess('Document deleted');
    },
  });

  // Register keyboard shortcuts
  useEffect(() => {
    registerAction('upload', () => uploadRef.current?.click());
    return () => unregisterAction('upload');
  }, [registerAction, unregisterAction]);

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
    setShowConversations(false);
  };

  // Start new conversation
  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setShowConversations(false);
  };

  // Get last message's suggestions
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant');

  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Left Sidebar - Documents */}
      <aside className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Projects</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
              <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {project?.name}
              </h1>
              <Badge size="sm">{project?.role_mode}</Badge>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Documents
            </h2>
            <span className="text-xs text-slate-500">
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
              onDelete={(doc) => deleteMutation.mutate(doc)}
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <Link
            href={`/projects/${projectId}/compare`}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <GitCompare className="w-4 h-4" />
            Compare Documents
          </Link>
        </div>
      </aside>

      {/* Main Content - Chat */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 px-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Conversation selector */}
            <div className="relative">
              <button
                onClick={() => setShowConversations(!showConversations)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {conversationId ? 'Current Session' : 'New Conversation'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showConversations && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-10">
                  <button
                    onClick={startNewConversation}
                    className="w-full px-4 py-2 text-sm text-left text-primary-600 dark:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Conversation
                  </button>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                  {conversationsData?.conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={cn(
                        'w-full px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700',
                        conv.id === conversationId
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : ''
                      )}
                    >
                      <div className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {conv.title || 'Untitled'}
                      </div>
                    </button>
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
          {messages.length === 0 && !isStreaming ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Ask a Question
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Start by asking a question about your documents. Homora will
                  analyze them and provide answers with citations.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onCitationClick={handleCitationClick}
                />
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <div className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                    <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                  </div>
                  <div className="flex-1 prose text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {streamingContent}
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {isStreaming && !streamingContent && (
                <div className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                    <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
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
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSendMessage}
              isLoading={isStreaming}
            />
          </div>
        </div>
      </main>

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
