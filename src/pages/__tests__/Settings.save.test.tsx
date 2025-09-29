import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import Settings from '../Settings';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

vi.mock('@/lib/api', () => {
  return {
    default: {
      patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    },
  };
});

describe('Settings save profile', () => {
  it('saves profile and shows success toast', async () => {
    useAuthStore.setState({ user: { id: 'u1', email: 'e@example.com' } as any, loading: false });
    renderWithAppProviders(<Settings />);

    // Scope to the "Your information" card
    const heading = await screen.findByRole('heading', { name: /your information/i });
    const card = heading.closest('div')?.parentElement?.parentElement as HTMLElement;
    const cardQ = within(card);

    // Fill in some fields
    fireEvent.change(cardQ.getByLabelText(/first name/i), { target: { value: 'Jane' } });
    fireEvent.change(cardQ.getByLabelText(/last name/i), { target: { value: 'Doe' } });

    // Click Save
    fireEvent.click(cardQ.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Saved' }));
    });
  });
});

