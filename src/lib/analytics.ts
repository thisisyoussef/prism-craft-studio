// Lightweight analytics helpers. Integrates with gtag or Segment if present; falls back to console.
// Safe to import anywhere in the client.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AnalyticsPayload = Record<string, any> | undefined;

export function trackEvent(event: string, props?: AnalyticsPayload) {
  try {
    if (typeof window === 'undefined') return;
    const w = window as any;
    if (typeof w.gtag === 'function') {
      w.gtag('event', event, props || {});
      return;
    }
    if (w.analytics && typeof w.analytics.track === 'function') {
      w.analytics.track(event, props || {});
      return;
    }
    // Fallback: console (useful in dev)
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, props || {});
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[analytics] failed', e);
  }
}

export const Analytics = {
  view404(pathname: string, referrer?: string) {
    trackEvent('404_view', { pathname, referrer: referrer || (typeof document !== 'undefined' ? document.referrer : '') });
  },
  search404(term: string, suggestionsCount: number) {
    trackEvent('404_search', { term, suggestionsCount });
  },
  ctaClick(label: string, href: string) {
    trackEvent('404_cta_click', { label, href });
  },
  categoryClick(category: string) {
    trackEvent('404_category_click', { category });
  },
  didYouMean(label: string, to: string) {
    trackEvent('404_did_you_mean', { label, to });
  },
  reportLink(href: string) {
    trackEvent('404_report_link', { href });
  },
  featuredClick(action: 'specs' | 'customize', productId: string) {
    trackEvent('404_featured_click', { action, productId });
  },
};
