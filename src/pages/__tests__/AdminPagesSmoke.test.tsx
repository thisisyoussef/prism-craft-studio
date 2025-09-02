import { screen } from '@testing-library/react';
import { renderWithAppProviders } from '@/test/test-utils';
import AdminOrders from '../AdminOrders';
import AdminOrderDetail from '../AdminOrderDetail';
import AdminProductEditor from '../AdminProductEditor';
import AdminNewProduct from '../AdminNewProduct';
import { useAuthStore } from '@/lib/store';

describe('Admin pages access guard', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'user-1' } as any, loading: false });
  });

  it('AdminOrders blocks non-admin', async () => {
    renderWithAppProviders(<AdminOrders />);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it('AdminOrderDetail blocks non-admin', async () => {
    renderWithAppProviders(<AdminOrderDetail />);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it('AdminProductEditor blocks non-admin', async () => {
    renderWithAppProviders(<AdminProductEditor />);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });

  it('AdminNewProduct blocks non-admin', async () => {
    renderWithAppProviders(<AdminNewProduct />);
    expect(await screen.findByText(/do not have access/i)).toBeInTheDocument();
  });
});

