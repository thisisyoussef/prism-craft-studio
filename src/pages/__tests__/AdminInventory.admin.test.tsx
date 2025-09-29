import React from 'react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';

vi.mock('@/lib/profile', () => ({
  useProfile: () => ({ data: { role: 'admin' }, isLoading: false })
}));

describe('AdminInventory page (admin)', () => {
  it('renders inventory header and pagination', async () => {
    useAuthStore.setState({ user: { id: 'admin-1', role: 'admin' } as any, loading: false });
    const { default: AdminInventory } = await import('../AdminInventory');
    renderWithAppProviders(<AdminInventory />);
    await waitFor(() => {
      expect(screen.getByText('Inventory')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });
});

