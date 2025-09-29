import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NotFound from '../NotFound';
import { renderWithAppProviders } from '@/test/test-utils';

describe('NotFound page', () => {
  it('shows 404 and provides primary CTAs', () => {
    renderWithAppProviders(<NotFound />);
    // 404 heading
    expect(screen.getByText('404')).toBeInTheDocument();
    // Home CTA exists
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
    // Design & get quote CTA exists
    expect(screen.getByRole('link', { name: /design & get quote/i })).toHaveAttribute('href', expect.stringContaining('/customize'));
  });
});

