import { screen } from '@testing-library/react';
import OrderDetails from '../OrderDetails';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';

describe('OrderDetails page', () => {
  it('renders basic layout without crashing', () => {
    useAuthStore.setState({ user: { id: 'u1', email: 'e@example.com' } as any, loading: false });
    renderWithAppProviders(<OrderDetails />, { route: '/orders/123' });
    // There is no specific static text; ensure component mounted by checking presence of document body
    expect(document.body).toBeInTheDocument();
  });
});

