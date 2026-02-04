'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FileText,
  Download,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNotifications } from '@/hooks/useNotifications';
import { downloadBlob } from '@/lib/utils';

interface ReportBuilderProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SECTIONS = [
  'Executive Summary',
  'Property Overview',
  'Key Findings',
  'Document Analysis',
  'Risk Assessment',
  'Recommendations',
  'Appendix',
];

export function ReportBuilder({
  projectId,
  projectName,
  isOpen,
  onClose,
}: ReportBuilderProps) {
  const { notifySuccess, notifyError } = useNotifications();
  const [title, setTitle] = useState(`Due Diligence Report: ${projectName}`);
  const [sections, setSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [newSection, setNewSection] = useState('');

  const { data: templates } = useQuery({
    queryKey: ['report-templates'],
    queryFn: reportsApi.listTemplates,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      reportsApi.generate({
        project_id: projectId,
        sections,
        title,
      }),
    onSuccess: (blob) => {
      downloadBlob(blob, `${projectName.replace(/\s+/g, '-')}-report.pdf`);
      notifySuccess('Report generated successfully');
      onClose();
    },
    onError: () => {
      notifyError('Failed to generate report');
    },
  });

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < sections.length) {
      [newSections[index], newSections[newIndex]] = [
        newSections[newIndex],
        newSections[index],
      ];
      setSections(newSections);
    }
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const addSection = () => {
    if (newSection.trim() && !sections.includes(newSection.trim())) {
      setSections((prev) => [...prev, newSection.trim()]);
      setNewSection('');
    }
  };

  const loadTemplate = (templateSections: string[]) => {
    setSections(templateSections);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Report" size="lg">
      <div className="p-6 space-y-6">
        {/* Title */}
        <Input
          label="Report Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Template Selection */}
        {templates && templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Load Template
            </label>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => loadTemplate(template.sections)}
                  className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Report Sections
          </label>
          <div className="space-y-2">
            {sections.map((section, index) => (
              <div
                key={section}
                className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
              >
                <div className="flex flex-col">
                  <button
                    onClick={() => moveSection(index, 'up')}
                    disabled={index === 0}
                    className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveSection(index, 'down')}
                    disabled={index === sections.length - 1}
                    className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                  {section}
                </span>
                <button
                  onClick={() => removeSection(index)}
                  className="p-1 text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Section */}
          <div className="flex gap-2 mt-3">
            <Input
              placeholder="Add custom section..."
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSection()}
            />
            <Button variant="secondary" onClick={addSection}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            isLoading={generateMutation.isPending}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Generate PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
