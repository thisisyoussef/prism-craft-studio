-- Ensure orders and payments are in the realtime publication so client subscriptions work
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.payments;
