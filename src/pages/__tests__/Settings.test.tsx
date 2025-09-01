import { screen } from '@testing-library/react';
import Settings from '../Settings';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';

describe('Settings page', () => {
  it('renders with a mocked user', () => {
    // Prime store with a user
    useAuthStore.setState({ user: { id: 'u1', email: 'e@example.com' } as any, loading: false });
    renderWithAppProviders(<Settings />);
    // Check for common labels present on the page
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
  });
});

