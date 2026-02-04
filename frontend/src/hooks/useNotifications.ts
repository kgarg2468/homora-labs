'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

interface NotificationOptions {
  playSound?: boolean;
}

export function useNotifications() {
  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info', options?: NotificationOptions) => {
      const toastFn = type === 'success' ? toast.success : type === 'error' ? toast.error : toast;
      toastFn(message);

      // Play notification sound if enabled
      if (options?.playSound && typeof window !== 'undefined') {
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {
            // Audio play can fail if user hasn't interacted with page
          });
        } catch {
          // Ignore audio errors
        }
      }
    },
    []
  );

  const notifySuccess = useCallback(
    (message: string, options?: NotificationOptions) => {
      notify(message, 'success', options);
    },
    [notify]
  );

  const notifyError = useCallback(
    (message: string, options?: NotificationOptions) => {
      notify(message, 'error', options);
    },
    [notify]
  );

  const notifyInfo = useCallback(
    (message: string, options?: NotificationOptions) => {
      notify(message, 'info', options);
    },
    [notify]
  );

  const notifyIngestionComplete = useCallback(
    (documentName: string) => {
      notifySuccess(`"${documentName}" has been processed successfully`, {
        playSound: true,
      });
    },
    [notifySuccess]
  );

  const notifyIngestionFailed = useCallback(
    (documentName: string, error?: string) => {
      notifyError(
        `Failed to process "${documentName}"${error ? `: ${error}` : ''}`,
        { playSound: true }
      );
    },
    [notifyError]
  );

  return {
    notify,
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyIngestionComplete,
    notifyIngestionFailed,
  };
}
