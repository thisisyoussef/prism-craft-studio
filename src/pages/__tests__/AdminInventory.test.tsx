import { screen } from '@testing-library/react';
import AdminInventory from '../AdminInventory';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';

describe('AdminInventory page', () => {
  it('blocks non-admin users', async () => {
    useAuthStore.setState({ user: { id: 'user-1' } as any, loading: false });
    renderWithAppProviders(<AdminInventory />);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });
});

