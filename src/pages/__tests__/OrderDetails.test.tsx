import { screen } from '@testing-library/react';
import OrderDetails from '../OrderDetails';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';

describe('OrderDetails page', () => {
  it('renders basic layout without crashing', () => {
    useAuthStore.setState({ user: { id: 'u1', email: 'e@example.com' } as any, loading: false });
    renderWithAppProviders(<OrderDetails />, { route: '/orders/123', path: '/orders/:id' });
    expect(document.body).toBeInTheDocument();
  });

  it('shows order details heading', () => {
    useAuthStore.setState({ user: { id: 'u1', email: 'e@example.com' } as any, loading: false });
    renderWithAppProviders(<OrderDetails />, { route: '/orders/123', path: '/orders/:id' });
    expect(screen.getByText(/order details/i)).toBeInTheDocument();
  });
});

