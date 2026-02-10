import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useParams: vi.fn(() => ({ id: 'test-project-id' })),
    useSearchParams: vi.fn(() => ({
        get: vi.fn(() => null),
    })),
    useRouter: vi.fn(() => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
    })),
}));

// Mock next/link
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => {
        const React = require('react');
        return React.createElement('a', { href }, children);
    },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
    toast: Object.assign(vi.fn(), {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    }),
    Toaster: () => null,
}));
