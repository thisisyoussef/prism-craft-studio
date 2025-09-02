import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import Settings from '../Settings';
import { renderWithAppProviders } from '@/test/test-utils';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';

describe('Settings password update', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'u1', email: 'e@example.com' } as any, loading: false });
  });

  it('shows validation toasts for short and mismatched passwords', async () => {
    renderWithAppProviders(<Settings />);
    const section = await screen.findByRole('heading', { name: /password/i });
    const card = section.closest('div')?.parentElement?.parentElement as HTMLElement;
    const q = within(card);

    // Short password
    fireEvent.change(q.getByLabelText(/new password/i), { target: { value: '123' } });
    fireEvent.change(q.getByLabelText(/confirm password/i), { target: { value: '123' } });
    fireEvent.click(q.getByRole('button', { name: /update password/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Password too short' })));

    // Mismatch
    fireEvent.change(q.getByLabelText(/new password/i), { target: { value: 'longpassword' } });
    fireEvent.change(q.getByLabelText(/confirm password/i), { target: { value: 'different' } });
    fireEvent.click(q.getByRole('button', { name: /update password/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Passwords don't match" })));
  });

  it('updates password successfully', async () => {
    renderWithAppProviders(<Settings />);
    const section = await screen.findByRole('heading', { name: /password/i });
    const card = section.closest('div')?.parentElement?.parentElement as HTMLElement;
    const q = within(card);

    fireEvent.change(q.getByLabelText(/new password/i), { target: { value: 'longpassword' } });
    fireEvent.change(q.getByLabelText(/confirm password/i), { target: { value: 'longpassword' } });
    fireEvent.click(q.getByRole('button', { name: /update password/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Password changed' })));
  });
});

