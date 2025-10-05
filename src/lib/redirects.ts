// Client-side redirect helpers for common legacy or mistyped routes.
// Keep this list small and intentional; use exact or startsWith rules only.

export type RedirectRule =
  | { type: 'exact'; from: string; to: string }
  | { type: 'prefix'; fromPrefix: string; to: string };

export const redirectRules: RedirectRule[] = [
  { type: 'exact', from: '/catalogue', to: '/catalog' },
  { type: 'exact', from: '/price', to: '/pricing' },
  { type: 'exact', from: '/design', to: '/designers' },
  { type: 'exact', from: '/quote', to: '/customize' },
  { type: 'prefix', fromPrefix: '/case-study', to: '/case-studies' },
];

export function findRedirect(pathname: string): string | null {
  for (const r of redirectRules) {
    if (r.type === 'exact' && pathname === r.from) return r.to;
    if (r.type === 'prefix' && pathname.startsWith(r.fromPrefix)) return r.to;
  }
  return null;
}
