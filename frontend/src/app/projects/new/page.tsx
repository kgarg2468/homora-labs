'use client';

import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { ProjectWizard } from '@/components/wizard/ProjectWizard';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
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
