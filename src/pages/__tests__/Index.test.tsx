import { screen } from '@testing-library/react';
import Index from '../Index';
import { renderWithAppProviders } from '@/test/test-utils';

describe('Index page', () => {
  it('renders without crashing and shows key sections', () => {
    renderWithAppProviders(<Index />);
    expect(screen.getByText('ProductCatalog')).toBeInTheDocument();
    expect(screen.getByText('PricingCalculator')).toBeInTheDocument();
    expect(screen.getByText('SampleOrdering')).toBeInTheDocument();
  });
});

