'use client';

import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { ProjectWizard } from '@/components/wizard/ProjectWizard';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function NewProjectPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-6 w-px bg-[var(--border)]" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-100 dark:bg-stone-900 rounded-lg">
                  <Building2 className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <h1 className="text-lg font-serif text-[var(--text-primary)]">
                  New Project
                </h1>
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProjectWizard />
      </main>
    </div>
  );
}
