'use client';

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { shortcuts, matchesShortcut } from '@/lib/shortcuts';

interface ShortcutActions {
  search: () => void;
  newProject: () => void;
  upload: () => void;
  sendMessage: () => void;
  closeModal: () => void;
  settings: () => void;
}

interface KeyboardShortcutsContextType {
  registerAction: (action: keyof ShortcutActions, handler: () => void) => void;
  unregisterAction: (action: keyof ShortcutActions) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null);

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [actions, setActions] = useState<Partial<ShortcutActions>>({});

  const registerAction = useCallback(
    (action: keyof ShortcutActions, handler: () => void) => {
      setActions((prev) => ({ ...prev, [action]: handler }));
    },
    []
  );

  const unregisterAction = useCallback((action: keyof ShortcutActions) => {
    setActions((prev) => {
      const next = { ...prev };
      delete next[action];
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        // Allow Escape and Cmd+Enter even in inputs
        if (event.key !== 'Escape' && !(event.key === 'Enter' && (event.metaKey || event.ctrlKey))) {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();

          switch (shortcut.action) {
            case 'search':
              setIsSearchOpen(true);
              break;
            case 'newProject':
              router.push('/projects/new');
              break;
            case 'upload':
              actions.upload?.();
              break;
            case 'sendMessage':
              actions.sendMessage?.();
              break;
            case 'closeModal':
              setIsSearchOpen(false);
              actions.closeModal?.();
              break;
            case 'settings':
              router.push('/settings');
              break;
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, actions]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{ registerAction, unregisterAction, isSearchOpen, setIsSearchOpen }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      'useKeyboardShortcuts must be used within KeyboardShortcutsProvider'
    );
  }
  return context;
}
