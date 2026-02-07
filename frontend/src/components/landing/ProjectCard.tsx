'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { FolderOpen, FileText, Clock, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { Project } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const handleMenuToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  const handleMenuAction = (
    event: ReactMouseEvent<HTMLButtonElement>,
    action: 'edit' | 'delete'
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(false);

    if (action === 'edit') {
      onEdit(project);
      return;
    }

    onDelete(project);
  };

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all group"
    >
      <div className="relative z-10 flex justify-end" ref={menuRef}>
        <button
          type="button"
          className="p-1.5 -mr-1 -mt-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          onClick={handleMenuToggle}
          aria-label={`Project actions for ${project.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute top-8 right-0 w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1 z-20"
          >
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
              onClick={(event) => handleMenuAction(event, 'edit')}
            >
              <Pencil className="w-4 h-4" />
              Edit Project
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              onClick={(event) => handleMenuAction(event, 'delete')}
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-900 transition-colors">
          <FolderOpen className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
        <Badge variant={project.role_mode === 'analytical' ? 'info' : 'default'}>
          {project.role_mode}
        </Badge>
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
        {project.name}
      </h3>

      {project.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          <span>{project.document_count} documents</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{formatRelativeTime(project.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}
