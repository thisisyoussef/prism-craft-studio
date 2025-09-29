import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminNewProduct from '../AdminNewProduct';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';
import * as profileModule from '@/lib/profile';

describe('AdminNewProduct page (admin)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' } as any, loading: false });
    vi.spyOn(profileModule, 'useProfile').mockReturnValue({
      data: { id: 'p1', user_id: 'admin-1', role: 'admin' } as any,
      isLoading: false,
    } as any);
  });

  it('shows form inputs', () => {
    renderWithAppProviders(<AdminNewProduct />);
    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/base price/i)).toBeInTheDocument();
  });
});

