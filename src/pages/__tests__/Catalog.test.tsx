import { screen } from '@testing-library/react';
import Catalog from '../Catalog';
import { renderWithAppProviders } from '@/test/test-utils';

describe('Catalog page', () => {
  it('renders ProductCatalog component', () => {
    renderWithAppProviders(<Catalog />);
    expect(screen.getByText('ProductCatalog')).toBeInTheDocument();
  });
});

