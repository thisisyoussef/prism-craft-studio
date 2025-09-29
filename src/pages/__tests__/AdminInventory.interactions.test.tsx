import React from 'react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

vi.mock('@/lib/profile', () => ({
  useProfile: () => ({ data: { role: 'admin' }, isLoading: false })
}));

vi.mock('@/lib/services/productService', () => {
  return {
    listProducts: vi.fn().mockResolvedValue([
      {
        id: 'p1',
        name: 'Prod 1',
        category: 'T-Shirts',
        basePrice: 10,
        description: 'Nice shirt',
        imageUrl: null,
        sizes: ['S', 'M', 'L'],
        colors: ['Black'],
        specifications: {},
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
    updateProduct: vi.fn().mockResolvedValue({}),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/services/variantService', () => {
  return {
    listByProductIds: vi.fn().mockResolvedValue([
      {
        id: 'v1',
        productId: 'p1',
        colorName: 'Black',
        colorHex: '#000000',
        imageUrl: null,
        frontImageUrl: null,
        backImageUrl: null,
        sleeveImageUrl: null,
        active: true,
      },
    ]),
  };
});

describe('AdminInventory interactions', () => {
  it('edits name, SKU, and stock and shows success toasts', async () => {
    useAuthStore.setState({ user: { id: 'admin-1', role: 'admin' } as any, loading: false });
    const { default: AdminInventory } = await import('../AdminInventory');
    const { queryClient } = renderWithAppProviders(<AdminInventory />);

    // Seed cache to ensure rows render synchronously
    queryClient.setQueryData(['admin-inventory'], {
      rows: [
        {
          id: 'p1', name: 'Prod 1', category: 'T-Shirts', basePrice: 10, description: 'Nice shirt', imageUrl: null,
          sizes: ['S','M','L'], colors: ['Black'], specifications: {}, active: true,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }
      ],
      total: 1,
      categories: ['T-Shirts']
    });

    // Wait for table to render
    await screen.findByText('Inventory');

    // Wait until data rows render (no "No products found")
    await waitFor(() => expect(screen.queryByText('No products found')).not.toBeInTheDocument());

    // Select a row that has the SKU input
    const table = screen.getByRole('table');
    const allRows = within(table).getAllByRole('row');
    const row = allRows.find(r => within(r).queryByPlaceholderText('SKU')) as HTMLElement;
    const rowQueries = within(row);

    // Name input is a textbox in the first cell; avoid the SKU placeholder
    const nameInput = rowQueries.getAllByRole('textbox')[0];
    fireEvent.focus(nameInput);
    fireEvent.change(nameInput, { target: { value: 'Prod 2' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Saved' }));
    });

    // SKU input by placeholder
    const skuInput = rowQueries.getByPlaceholderText('SKU');
    fireEvent.focus(skuInput);
    fireEvent.change(skuInput, { target: { value: 'NEWSKU' } });
    fireEvent.blur(skuInput);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Saved' }));
    });

    // Stock input is number spinbutton
    const stockInput = rowQueries.getAllByRole('spinbutton')[0];
    fireEvent.focus(stockInput);
    fireEvent.change(stockInput, { target: { value: '7' } });
    fireEvent.blur(stockInput);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Saved' }));
    });
  });
});

