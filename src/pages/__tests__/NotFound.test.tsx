import { screen } from '@testing-library/react';
import NotFound from '../NotFound';
import { renderWithAppProviders } from '@/test/test-utils';

describe('NotFound page', () => {
  it('shows 404 and link to home', () => {
    renderWithAppProviders(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to home/i })).toHaveAttribute('href', '/');
  });
});

