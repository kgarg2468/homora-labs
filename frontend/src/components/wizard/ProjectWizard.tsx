'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  Check,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { projectsApi, documentsApi } from '@/lib/api';
import { useNotifications } from '@/hooks/useNotifications';
import { cn, getStatusColor } from '@/lib/utils';
import type { RoleMode, Document } from '@/lib/types';

type WizardStep = 'details' | 'upload' | 'processing' | 'complete';

interface UploadedFile {
  file: File;
  document?: Document;
  error?: string;
}

export function ProjectWizard() {
  const router = useRouter();
  const { notifyError } = useNotifications();
  const [step, setStep] = useState<WizardStep>('details');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleMode, setRoleMode] = useState<RoleMode>('plain');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const createProject = useMutation({
    mutationFn: () => projectsApi.create({ name, description, role_mode: roleMode }),
    onSuccess: (project) => {
      setProjectId(project.id);
      setStep('upload');
    },
    onError: (error) => {
      notifyError(error instanceof Error ? error.message : 'Failed to create project');
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      if (!projectId) throw new Error('No project ID');
      return documentsApi.upload(projectId, file);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.tiff'],
    },
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map((file) => ({ file }));
      setFiles((prev) => [...prev, ...newFiles]);
    },
  });

  const handleUploadAll = async () => {
    setStep('processing');

    const updatedFiles = [...files];
    for (let i = 0; i < updatedFiles.length; i++) {
      try {
        const document = await uploadFile.mutateAsync(updatedFiles[i].file);
        updatedFiles[i] = { ...updatedFiles[i], document };
      } catch (error) {
        updatedFiles[i] = {
          ...updatedFiles[i],
          error: error instanceof Error ? error.message : 'Upload failed',
        };
      }
      setFiles([...updatedFiles]);
    }

    setStep('complete');
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const allFilesProcessed = files.every(
    (f) => f.document?.ingestion_status === 'completed' || f.error
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        {(['details', 'upload', 'processing', 'complete'] as const).map(
          (s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s || (['upload', 'processing', 'complete'].indexOf(step) >= i)
                    ? 'bg-zinc-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                )}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div
                  className={cn(
                    'w-16 h-1 mx-1',
                    ['upload', 'processing', 'complete'].indexOf(step) > i
                      ? 'bg-primary-600'
                      : 'bg-slate-200 dark:bg-slate-700'
                  )}
                />
              )}
            </div>
          )
        )}
      </div>

      {/* Step: Details */}
      {step === 'details' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
            Create New Project
          </h2>

          <div className="space-y-4">
            <Input
              label="Project Name"
              placeholder="e.g., 123 Main Street Acquisition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Description (optional)
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Brief description of the project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Response Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    value: 'plain' as const,
                    label: 'Plain',
                    description: 'Clear, everyday language',
                  },
                  {
                    value: 'analytical' as const,
                    label: 'Analytical',
                    description: 'Technical terminology',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRoleMode(option.value)}
                    className={cn(
                      'p-4 rounded-lg border text-left transition-colors',
                      roleMode === option.value
                        ? 'border-slate-500 bg-slate-100 dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {option.label}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => createProject.mutate()}
              isLoading={createProject.isPending}
              disabled={!name.trim()}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Upload Documents
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Add the documents you want to analyze
          </p>

          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-slate-500 bg-slate-100 dark:bg-slate-800'
                : 'border-slate-300 dark:border-slate-600 hover:border-slate-500'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              PDF, DOCX, XLSX, or images
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                >
                  <FileText className="w-5 h-5 text-slate-500" />
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">
                    {f.file.name}
                  </span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep('details')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleUploadAll}
              disabled={files.length === 0}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Upload & Process
            </Button>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Processing Documents
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Please wait while your documents are being analyzed...
          </p>

          <div className="space-y-3">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
              >
                <FileText className="w-5 h-5 text-slate-500" />
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">
                  {f.file.name}
                </span>
                {f.error ? (
                  <span className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    Failed
                  </span>
                ) : f.document ? (
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      getStatusColor(f.document.ingestion_status)
                    )}
                  >
                    {f.document.ingestion_status === 'completed' ? (
                      <Check className="w-4 h-4" />
                    ) : f.document.ingestion_status === 'processing' ? (
                      `${f.document.ingestion_progress}%`
                    ) : (
                      f.document.ingestion_status
                    )}
                  </span>
                ) : (
                  <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Project Ready!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Your documents have been uploaded and are being processed.
            You can start asking questions now.
          </p>

          <Button onClick={() => router.push(`/projects/${projectId}`)}>
            Start Chatting
          </Button>
        </div>
      )}
    </div>
  );
}
