'use client';

import Link from 'next/link';
import { MessageSquare, FileText, FolderPlus } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'conversation' | 'document' | 'project';
  title: string;
  project_name: string;
  project_id: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'conversation':
        return <MessageSquare className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'project':
        return <FolderPlus className="w-4 h-4" />;
    }
  };

  const getLabel = (type: ActivityItem['type']) => {
    switch (type) {
      case 'conversation':
        return 'New conversation';
      case 'document':
        return 'Document uploaded';
      case 'project':
        return 'Project created';
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <p>No recent activity</p>
        <p className="text-sm mt-1">Create a project to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <Link
          key={activity.id}
          href={`/projects/${activity.project_id}`}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
        >
          <div className="p-2 bg-stone-100 dark:bg-stone-900 rounded-lg text-[var(--text-muted)]">
            {getIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {activity.title}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {getLabel(activity.type)} in {activity.project_name}
            </p>
          </div>
          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
            {formatRelativeTime(activity.timestamp)}
          </span>
        </Link>
      ))}
    </div>
  );
}
