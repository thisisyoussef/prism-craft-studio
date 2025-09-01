import { screen, waitFor } from '@testing-library/react';
import AdminOrders from '../AdminOrders';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';
import * as profileModule from '@/lib/profile';

describe('AdminOrders page (admin)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@example.com' } as any, loading: false });
    vi.spyOn(profileModule, 'useProfile').mockReturnValue({
      data: { id: 'p1', user_id: 'admin-1', role: 'admin' } as any,
      isLoading: false,
    } as any);
  });

  it('renders and shows table headings', async () => {
    renderWithAppProviders(<AdminOrders />);
    await waitFor(() => {
      const headers = screen.getAllByRole('columnheader').map(h => h.textContent?.trim());
      expect(headers).toEqual(expect.arrayContaining(['Order #','Status','Customer']));
    });
  });
});

