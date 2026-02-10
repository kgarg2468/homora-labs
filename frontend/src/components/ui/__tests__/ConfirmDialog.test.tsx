import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';

// Mock @headlessui/react to render children directly
vi.mock('@headlessui/react', () => ({
    Dialog: Object.assign(
        ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
            <div role="dialog" data-testid="dialog" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                {children}
            </div>
        ),
        {
            Panel: ({ children, className }: { children: React.ReactNode; className: string }) => (
                <div className={className}>{children}</div>
            ),
            Title: ({ children, className }: { children: React.ReactNode; className: string }) => (
                <h2 className={className} data-testid="dialog-title">{children}</h2>
            ),
            Description: ({ children, className }: { children: React.ReactNode; className: string }) => (
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

describe('ConfirmDialog', () => {
    const defaultProps = {
        open: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        title: 'Delete Item?',
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger' as const,
        isLoading: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders title and description when open', () => {
        render(<ConfirmDialog {...defaultProps} />);

        expect(screen.getByTestId('dialog-title')).toHaveTextContent('Delete Item?');
        expect(screen.getByTestId('dialog-description')).toHaveTextContent('This action cannot be undone.');
    });

    it('does not render when closed', () => {
        render(<ConfirmDialog {...defaultProps} open={false} />);

        expect(screen.queryByTestId('dialog-title')).not.toBeInTheDocument();
    });

    it('renders confirm and cancel buttons with correct text', () => {
        render(<ConfirmDialog {...defaultProps} />);

        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button is clicked', () => {
        render(<ConfirmDialog {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
        expect(defaultProps.onConfirm).toHaveBeenCalledOnce();
    });

    it('calls onClose when cancel button is clicked', () => {
        render(<ConfirmDialog {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
        render(<ConfirmDialog {...defaultProps} />);

        // The X button is the one that is not Cancel and not Delete
        const buttons = screen.getAllByRole('button');
        const xButton = buttons.find(btn =>
            !btn.textContent?.includes('Delete') && !btn.textContent?.includes('Cancel')
        );
        expect(xButton).toBeTruthy();
        fireEvent.click(xButton!);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('uses default confirmText and cancelText when not provided', () => {
        const { confirmText, cancelText, ...propsWithoutText } = defaultProps;
        render(<ConfirmDialog {...propsWithoutText} />);

        expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('disables cancel button when isLoading', () => {
        render(<ConfirmDialog {...defaultProps} isLoading={true} />);

        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
});
