import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill scrollTo to avoid errors in components using it
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

// Polyfill ResizeObserver used by some UI components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(window as any).ResizeObserver = (window as any).ResizeObserver || ResizeObserverMock;

// Mock matchMedia used by some UI libs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Provide minimal env vars expected by Supabase client
(globalThis as any).import = { meta: { env: {} } };
(globalThis as any).process = (globalThis as any).process || { env: {} };
(import.meta as any).env = {
  VITE_SUPABASE_URL: 'http://localhost:54321',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key',
};

// Mock Supabase client modules to avoid real network/storage and provide minimal data
function makeSupabaseMock() {
  const createQueryBuilder = (table: string) => {
    let selectArg: any = null;
    const builder: any = {
      select: vi.fn((arg?: any) => { selectArg = arg; return builder; }),
      range: vi.fn(() => builder),
      order: vi.fn(async () => {
        if (table === 'products') {
          if (typeof selectArg === 'string' && selectArg.includes('category')) {
            return { data: [{ category: 'shirts' }], error: null };
          }
          return {
            data: [{
              id: 'p1',
              name: 'Prod',
              description: 'Desc',
              category: 'shirts',
              base_price: 10,
              image_url: null,
              available_colors: ['red'],
              available_sizes: ['S'],
              customization_options: { sku: 'SKU', stock: 5, active: true },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }],
            error: null,
            count: 1,
          };
        }
        return { data: [], error: null };
      }),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(async () => {
        if (table === 'orders') {
          return { data: { id: '123', order_number: 'ORD-123', status: 'draft', total_amount: 100, created_at: new Date().toISOString(), products: { name: 'Prod', image_url: null } }, error: null };
        }
        return { data: null, error: null };
      }),
      insert: vi.fn(async () => ({ data: null, error: null })),
      update: vi.fn(async () => ({ data: null, error: null })),
      delete: vi.fn(async () => ({ data: null, error: null })),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      lte: vi.fn(() => builder),
    };
    return builder;
  };

  const storageBucket = {
    upload: vi.fn(async () => ({ data: null, error: null })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://example.com/image.png' } })),
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'http://example.com/signed.png' }, error: null })),
  };
  const supabase: any = {
    from: vi.fn((table: string) => {
      const qb = createQueryBuilder(table);
      // Hook into payments/production_updates to return arrays
      if (table === 'payments') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              eq: vi.fn(async () => ({
                data: [
                  { phase: 'deposit', amount_cents: 4000, status: 'requires_payment_method' },
                  { phase: 'balance', amount_cents: 6000, status: 'requires_payment_method' },
                ],
                error: null,
              })),
            })),
            eq: vi.fn(async () => ({
              data: [
                { phase: 'deposit', amount_cents: 4000, status: 'requires_payment_method' },
                { phase: 'balance', amount_cents: 6000, status: 'requires_payment_method' },
              ],
              error: null,
            })),
          }))
        } as any;
      }
      if (table === 'production_updates') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: [], error: null })) }))
        } as any;
      }
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { role: 'user' }, error: null })) })) }))
        } as any;
      }
      return qb;
    }),
    storage: { from: vi.fn(() => storageBucket) },
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(async () => ({ data: { user: { id: 'u1', email: 'test@example.com' } } })),
      signUp: vi.fn(async () => ({ data: { user: { id: 'u1', email: 'test@example.com' } } })),
      signOut: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ data: {}, error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })),
    },
    channel: vi.fn(() => ({ on: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ data: {}, error: null })) })) })) })),
  };
  return { supabase };
}

vi.mock('@/integrations/supabase/client', () => makeSupabaseMock());
vi.mock('@/lib/supabase', () => makeSupabaseMock());

// Mock use-toast to avoid real toasts and capture messages
vi.mock('@/hooks/use-toast', async () => {
  const toast = vi.fn();
  return { useToast: () => ({ toast }), toast };
});

// Mock Navigation and heavy home components to keep tests fast
vi.mock('@/components/Navigation', () => ({ default: () => null }));
vi.mock('@/components/HeroSection', () => ({ default: () => null }));
vi.mock('@/components/BusinessReviews', () => ({ BusinessReviews: () => null }));
vi.mock('@/components/FeaturesSection', () => ({ default: () => null }));
vi.mock('@/components/ProductCatalog', () => ({ default: () => 'ProductCatalog' }));
vi.mock('@/components/PricingCalculator', () => ({ default: () => 'PricingCalculator' }));
vi.mock('@/components/SampleOrdering', () => ({ default: () => 'SampleOrdering' }));
vi.mock('@/components/ScrollToTop', () => ({ default: () => null }));
vi.mock('@/components/ui/toaster', () => ({ Toaster: () => null }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('@/components/ProductCustomizer', () => ({ default: () => 'ProductCustomizer' }));

// Provide a helper to render with providers
export { renderWithAppProviders } from './test-utils';

