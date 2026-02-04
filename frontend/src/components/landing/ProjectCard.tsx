'use client';

import Link from 'next/link';
import { FolderOpen, FileText, Clock } from 'lucide-react';
import type { Project } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg transition-all group"
    >
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
