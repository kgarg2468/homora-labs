'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
                <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Homora
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
                {mounted && searchShortcut && (
                  <kbd className="hidden sm:inline px-1.5 py-0.5 text-xs bg-white dark:bg-slate-600 rounded">
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Projects
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {data?.total || 0} total
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-600 dark:text-red-400">
                Failed to load projects. Please try again.
              </div>
            ) : data?.projects.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <FolderOpen className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  No projects yet
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">
              Recent Activity
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <RecentActivity activities={[]} />
            </div>

            {/* Quick tips */}
            <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
              <h3 className="font-medium text-primary-900 dark:text-primary-100 mb-2">
                Keyboard Shortcuts
              </h3>
              <ul className="space-y-1.5 text-sm text-primary-700 dark:text-primary-300">
                {shortcuts.slice(0, 4).map((shortcut) => (
                  <li key={shortcut.action} className="flex justify-between">
                    <span>{shortcut.description}</span>
                    {mounted && (
                      <kbd className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-800 rounded text-xs">
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
