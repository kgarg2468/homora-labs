import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { useNotifications } from '../useNotifications';

describe('useNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('notifySuccess calls toast.success with message', () => {
        const { result } = renderHook(() => useNotifications());

        result.current.notifySuccess('Item restored');

        expect(toast.success).toHaveBeenCalledWith('Item restored');
    });

    it('notifyError calls toast.error with message', () => {
        const { result } = renderHook(() => useNotifications());

        result.current.notifyError('Failed to restore');

        expect(toast.error).toHaveBeenCalledWith('Failed to restore');
    });

    it('notifyInfo calls toast with message', () => {
        const { result } = renderHook(() => useNotifications());

        result.current.notifyInfo('Processing...');

        expect(toast).toHaveBeenCalledWith('Processing...');
    });

    it('notifyIngestionComplete calls toast.success with formatted message', () => {
        const { result } = renderHook(() => useNotifications());

        result.current.notifyIngestionComplete('report.pdf');

        expect(toast.success).toHaveBeenCalledWith('"report.pdf" has been processed successfully');
    });

    it('notifyIngestionFailed calls toast.error with formatted message', () => {
        const { result } = renderHook(() => useNotifications());

        result.current.notifyIngestionFailed('report.pdf', 'File too large');

        expect(toast.error).toHaveBeenCalledWith('Failed to process "report.pdf": File too large');
    });

    it('notifyIngestionFailed works without error message', () => {
        const { result } = renderHook(() => useNotifications());

        result.current.notifyIngestionFailed('report.pdf');

        expect(toast.error).toHaveBeenCalledWith('Failed to process "report.pdf"');
    });
});
