import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

vi.mock('@/lib/profile', () => ({
  useProfile: () => ({ data: { role: 'admin' }, isLoading: false })
}));

describe('AdminInventory interactions', () => {
  it('edits name, SKU, and stock and shows success toasts', async () => {
    useAuthStore.setState({ user: { id: 'admin-1' } as any, loading: false });
    const { default: AdminInventory } = await import('../AdminInventory');
    renderWithAppProviders(<AdminInventory />);

    // Wait for table to render
    await screen.findByText('Inventory');

    // Find the row by a stable value (category or price)
    const priceCell = await screen.findByText('$10.00');
    const row = priceCell.closest('tr') as HTMLElement;
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

