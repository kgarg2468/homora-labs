'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Settings,
  FolderOpen,
  Loader2,
  Building2,
} from 'lucide-react';
import { projectsApi } from '@/lib/api';
import { ProjectCard } from '@/components/landing/ProjectCard';
import { RecentActivity } from '@/components/landing/RecentActivity';
import { SearchModal } from '@/components/search/SearchModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNotifications } from '@/hooks/useNotifications';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { DeleteProjectModal } from '@/components/projects/DeleteProjectModal';
import { formatShortcut, shortcuts } from '@/lib/shortcuts';
import type { Project, RoleMode } from '@/lib/types';

export default function HomePage() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { setIsSearchOpen } = useKeyboardShortcuts();
  const { notifySuccess, notifyError } = useNotifications();
  const searchShortcut = shortcuts.find((s) => s.action === 'search');

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name: string; description: string; role_mode: RoleMode };
    }) => projectsApi.update(id, payload),
    onSuccess: () => {
      setProjectToEdit(null);
      setEditError(null);
      notifySuccess('Project updated');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update project';
      setEditError(message);
      notifyError(message);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      setProjectToDelete(null);
      setDeleteError(null);
      notifySuccess('Project deleted');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete project';
      setDeleteError(message);
      notifyError(message);
    },
  });

  const handleOpenEditModal = (project: Project) => {
    setEditError(null);
    setProjectToEdit(project);
  };

  const handleOpenDeleteModal = (project: Project) => {
    setDeleteError(null);
    setProjectToDelete(project);
  };

  const handleCloseEditModal = () => {
    if (updateProjectMutation.isPending) return;
    setEditError(null);
    setProjectToEdit(null);
  };

  const handleCloseDeleteModal = () => {
    if (deleteProjectMutation.isPending) return;
    setDeleteError(null);
    setProjectToDelete(null);
  };

  const handleEditSubmit = (payload: { name: string; description: string; role_mode: RoleMode }) => {
    if (!projectToEdit) return;
    updateProjectMutation.mutate({ id: projectToEdit.id, payload });
  };

  const handleDeleteConfirm = () => {
    if (!projectToDelete) return;
    deleteProjectMutation.mutate(projectToDelete.id);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 relative">
                <Image
                  src="/logo.png"
                  alt="Homora Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <h1 className="text-xl font-serif text-[var(--text-primary)]">
                Homora
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-muted)] bg-stone-100 dark:bg-stone-900 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-950 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
                {mounted && searchShortcut && (
                  <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-mono bg-[var(--surface)] border border-[var(--border)] rounded-md">
                    {formatShortcut(searchShortcut)}
                  </kbd>
                )}
              </button>

              <ThemeToggle />

              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>

              <Link href="/projects/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  New Project
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-[var(--text-primary)]">
                Projects
              </h2>
              <span className="text-sm text-[var(--text-muted)]">
                {data?.total || 0} total
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-[#B85450]">
                Failed to load projects. Please try again.
              </div>
            ) : data?.projects.length === 0 ? (
              <div className="text-center py-12 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                <div className="w-16 h-16 mx-auto mb-4 bg-stone-100 dark:bg-stone-900 rounded-lg flex items-center justify-center animate-breathe">
                  <FolderOpen className="w-8 h-8 text-[var(--text-muted)]" />
                </div>
                <h3 className="font-serif text-2xl text-[var(--text-primary)] mb-2">
                  No projects yet
                </h3>
                <p className="text-[var(--text-muted)] mb-4">
                  Create your first project to start analyzing documents
                </p>
                <Link href="/projects/new">
                  <Button leftIcon={<Plus className="w-4 h-4" />}>
                    Create Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data?.projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={handleOpenEditModal}
                    onDelete={handleOpenDeleteModal}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Activity sidebar */}
          <div>
            <h2 className="text-lg font-serif text-[var(--text-primary)] mb-6">
              Recent Activity
            </h2>
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
              <RecentActivity activities={[]} />
            </div>

            {/* Quick tips */}
            <div className="mt-6 p-4 bg-accent-50/50 dark:bg-accent-950/20 rounded-xl border border-accent-200/30 dark:border-accent-800/20">
              <h3 className="font-medium text-[var(--text-primary)] mb-2">
                Keyboard Shortcuts
              </h3>
              <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                {shortcuts.slice(0, 4).map((shortcut) => (
                  <li key={shortcut.action} className="flex justify-between">
                    <span>{shortcut.description}</span>
                    {mounted && (
                      <kbd className="px-1.5 py-0.5 font-mono bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs">
                        {formatShortcut(shortcut)}
                      </kbd>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      <SearchModal />
      <EditProjectModal
        isOpen={Boolean(projectToEdit)}
        project={projectToEdit}
        isSubmitting={updateProjectMutation.isPending}
        apiError={editError}
        onClose={handleCloseEditModal}
        onSubmit={handleEditSubmit}
      />
      <DeleteProjectModal
        isOpen={Boolean(projectToDelete)}
        project={projectToDelete}
        isDeleting={deleteProjectMutation.isPending}
        apiError={deleteError}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
