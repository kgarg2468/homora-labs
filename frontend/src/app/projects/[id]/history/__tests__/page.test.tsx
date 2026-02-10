import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import ProjectHistoryPage from '../page';

// Mock the API modules
vi.mock('@/lib/api', () => ({
    projectsApi: {
        get: vi.fn().mockResolvedValue({ id: 'test-project-id', name: 'Test Project' }),
        getTrash: vi.fn().mockResolvedValue({
            items: [
                {
                    id: 'doc-1',
                    type: 'document',
                    title: 'Report.pdf',
                    created_at: '2025-01-01T00:00:00Z',
                    deleted_at: '2025-01-02T00:00:00Z',
                },
                {
                    id: 'conv-1',
                    type: 'conversation',
                    title: 'Summarize report',
                    created_at: '2025-01-01T00:00:00Z',
                    deleted_at: '2025-01-02T00:00:00Z',
                },
            ],
        }),
    },
    chatApi: {
        listConversations: vi.fn().mockResolvedValue({ conversations: [] }),
        restoreConversation: vi.fn().mockResolvedValue(undefined),
        purgeConversation: vi.fn().mockResolvedValue(undefined),
    },
    documentsApi: {
        list: vi.fn().mockResolvedValue({ documents: [] }),
        restore: vi.fn().mockResolvedValue(undefined),
        purge: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock headlessui
vi.mock('@headlessui/react', () => ({
    Dialog: Object.assign(
        ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
            <div role="dialog" data-testid="dialog" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                {children}
            </div>
        ),
        {
            Panel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
                <div className={className}>{children}</div>
            ),
            Title: ({ children, className }: { children: React.ReactNode; className?: string }) => (
                <h2 className={className} data-testid="dialog-title">{children}</h2>
            ),
            Description: ({ children, className }: { children: React.ReactNode; className?: string }) => (
                <p className={className} data-testid="dialog-description">{children}</p>
            ),
        }
    ),
    Transition: Object.assign(
        ({ show, children }: { show: boolean; children: React.ReactNode }) => (show ? <>{children}</> : null),
        {
            Child: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        }
    ),
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}

describe('ProjectHistoryPage - Trash View', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set view=trash
        vi.mocked(useSearchParams).mockReturnValue({
            get: vi.fn((key: string) => (key === 'view' ? 'trash' : null)),
        } as unknown as ReturnType<typeof useSearchParams>);
    });

    it('renders trash items', async () => {
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Report.pdf')).toBeInTheDocument();
            expect(screen.getByText('Summarize report')).toBeInTheDocument();
        });
    });

    it('shows "Deleted" badges on trash items', async () => {
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            const badges = screen.getAllByText('Deleted');
            expect(badges.length).toBe(2);
        });
    });

    it('shows bulk actions toolbar with Select all and Empty Trash', async () => {
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText(/Select all/)).toBeInTheDocument();
            expect(screen.getByText('Empty Trash')).toBeInTheDocument();
        });
    });

    it('shows Restore and Delete Permanently buttons for each item', async () => {
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            const restoreButtons = screen.getAllByText('Restore');
            const deleteButtons = screen.getAllByText('Delete Permanently');
            expect(restoreButtons.length).toBe(2);
            expect(deleteButtons.length).toBe(2);
        });
    });

    it('opens confirmation dialog when Delete Permanently is clicked', async () => {
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getAllByText('Delete Permanently').length).toBe(2);
        });

        // Click first Delete Permanently button
        fireEvent.click(screen.getAllByText('Delete Permanently')[0]);

        await waitFor(() => {
            expect(screen.getByTestId('dialog-title')).toHaveTextContent('Delete Permanently?');
        });
    });

    it('opens Empty Trash confirmation dialog', async () => {
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Empty Trash')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Empty Trash'));

        await waitFor(() => {
            expect(screen.getByTestId('dialog-title')).toHaveTextContent('Empty Trash?');
        });
    });

    it('calls restore API when Restore is clicked', async () => {
        const { documentsApi } = await import('@/lib/api');
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getAllByText('Restore').length).toBe(2);
        });

        fireEvent.click(screen.getAllByText('Restore')[0]);

        await waitFor(() => {
            expect(documentsApi.restore).toHaveBeenCalledWith('test-project-id', 'doc-1');
        });
    });

    it('toggles selection when checkbox is clicked', async () => {
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Report.pdf')).toBeInTheDocument();
        });

        // Individual item checkboxes are buttons with JUST an svg, no text
        const itemCheckboxes = screen.getAllByRole('button').filter(btn =>
            btn.querySelector('svg') && btn.textContent === ''
        );

        // Click first item checkbox
        fireEvent.click(itemCheckboxes[0]);

        await waitFor(() => {
            expect(screen.getByText('1 of 2 selected')).toBeInTheDocument();
            expect(screen.getByText('Restore Selected (1)')).toBeInTheDocument();
        });

        // Click again to deselect
        fireEvent.click(itemCheckboxes[0]);

        await waitFor(() => {
            expect(screen.queryByText('1 of 2 selected')).not.toBeInTheDocument();
            expect(screen.queryByText(/Restore Selected/)).not.toBeInTheDocument();
        });
    });

    it('toggles Select All correctly', async () => {
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText(/Select all/)).toBeInTheDocument();
        });

        const selectAllButton = screen.getByText(/Select all/).closest('button');
        fireEvent.click(selectAllButton!);

        await waitFor(() => {
            expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
            expect(screen.getByText('Restore Selected (2)')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('2 of 2 selected').closest('button')!);

        await waitFor(() => {
            expect(screen.queryByText(/of 2 selected/)).not.toBeInTheDocument();
            expect(screen.getByText(/Select all/)).toBeInTheDocument();
        });
    });

    it('calls multiple API endpoints during bulk restore', async () => {
        const { documentsApi, chatApi } = await import('@/lib/api');
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText(/Select all/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Select all/).closest('button')!);

        await waitFor(() => {
            expect(screen.getByText('Restore Selected (2)')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Restore Selected (2)'));

        await waitFor(() => {
            expect(documentsApi.restore).toHaveBeenCalledWith('test-project-id', 'doc-1');
            expect(chatApi.restoreConversation).toHaveBeenCalledWith('test-project-id', 'conv-1');
        });
    });
});

describe('ProjectHistoryPage - All View', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set view to all (no trash param)
        vi.mocked(useSearchParams).mockReturnValue({
            get: vi.fn(() => null),
        } as unknown as ReturnType<typeof useSearchParams>);
    });

    it('renders without bulk actions toolbar in all view', async () => {
        render(<ProjectHistoryPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            // The toolbar should not appear in all view (requires trashOnly && items > 0)
            expect(screen.queryByText(/Select all/)).not.toBeInTheDocument();
        });
    });
});
