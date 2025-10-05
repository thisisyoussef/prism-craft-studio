import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { ArrowLeft, BadgeDollarSign, Home, LayoutDashboard, Package, PencilLine, Search } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { listProducts, type ApiProduct } from "@/lib/services/productService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { caseStudiesData } from "@/data/caseStudies";
import { Analytics } from "@/lib/analytics";
import { findRedirect } from "@/lib/redirects";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [term, setTerm] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reportHref = useMemo(() => {
    const href = typeof window !== 'undefined' ? window.location.href : location.pathname;
    const subject = encodeURIComponent(`404 on ${href}`);
    const body = encodeURIComponent(`I hit a 404 on: ${href}\n\nAnything you need to know:`);
    return `mailto:support@example.com?subject=${subject}&body=${body}`;
  }, [location.pathname]);

  // Load products to power dynamic suggestions
  const { data: products } = useQuery<ApiProduct[]>({
    queryKey: ["notfound-products"],
    queryFn: async () => {
      const items = await listProducts();
      return (items || []).filter(p => p.active !== false);
    },
  });

  const popularCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products || []) {
      const cat = (p.category || '').trim();
      if (!cat) continue;
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a,b) => b[1]-a[1]).map(([name]) => name);
    const fallback = ['T-Shirts','Hoodies','Accessories','Polos','Sweatshirts'];
    return (sorted.length > 0 ? sorted : fallback).slice(0, 5);
  }, [products]);

  // Autofocus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Compute search suggestions (top 5) as user types
  const searchSuggestions = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q || q.length < 2) return [] as ApiProduct[];
    const list = (products || []) as ApiProduct[];
    return list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)).slice(0, 5);
  }, [term, products]);

  // Simple route suggestions ("Did you mean …")
  const routeHints = useMemo(() => {
    const last = (location.pathname || '/').split('/').filter(Boolean).pop() || '';
    if (!last || last.length < 3) return [] as { label: string; to: string }[];
    const routes: { label: string; to: string }[] = [
      { label: 'Catalog', to: '/catalog' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Customize', to: '/customize' },
      { label: 'Design help', to: '/designers' },
      { label: 'Case studies', to: '/case-studies' },
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
    ];
    const score = (a: string, b: string) => {
      // Light-weight similarity: common subsequence length vs avg length
      const s = a.toLowerCase();
      const t = b.toLowerCase();
      let i = 0, j = 0, lcs = 0;
      while (i < s.length && j < t.length) {
        if (s[i] === t[j]) { lcs++; i++; j++; } else { if (s.length - i > t.length - j) i++; else j++; }
      }
      const avg = (s.length + t.length) / 2;
      return lcs / Math.max(1, avg);
    };
    const ranked = routes
      .map(r => ({ r, sc: Math.max(score(last, r.label), score(last, r.to.replace('/', ''))) }))
      .filter(x => x.sc >= 0.35)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 3)
      .map(x => x.r);
    return ranked;
  }, [location.pathname]);

  const featured = useMemo(() => {
    const list = (products || []) as ApiProduct[];
    const withCovers = list.filter(p => p.imageUrl && p.imageUrl !== '/placeholder.svg');
    const picks = (withCovers.length > 0 ? withCovers : list).slice(0, 3);
    return picks;
  }, [products]);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    Analytics.view404(location.pathname, typeof document !== 'undefined' ? document.referrer : undefined);
  }, [location.pathname]);

  // Auto-redirect for known legacy/mistyped routes
  useEffect(() => {
    const target = findRedirect(location.pathname);
    if (target) {
      navigate(`${target}?ref=redir-404`, { replace: true });
    }
  }, [location.pathname, navigate]);

  // Keyboard shortcuts: '/' focuses the search box, 'Escape' clears term
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
      if (!typing && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && term) {
        setTerm('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [term]);

  return (
    <>
      <Navigation />
      <Helmet>
        <title>Page not found | Prism Craft Studio</title>
        <meta name="robots" content="noindex,follow" />
        <meta name="description" content="The page you’re looking for doesn’t exist. Explore our products, pricing, and design services." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="text-7xl font-semibold tracking-tight">404</div>
          <p className="mt-3 text-base text-muted-foreground">We couldn’t find that page.</p>
          <p className="mt-1 text-sm text-muted-foreground">Here are helpful links to continue.</p>

          {/* Search */}
          <form
            className="mt-6 max-w-2xl mx-auto flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const q = term.trim();
              if (!q) return navigate('/catalog');
              try { Analytics.search404(q, searchSuggestions.length); } catch {}
              navigate(`/catalog?search=${encodeURIComponent(q)}`);
            }}
          >
            <Input
              ref={inputRef}
              value={term}
              onChange={(e) => setTerm(e.currentTarget.value)}
              placeholder="Search products, categories, or descriptions"
              className="h-12"
            />
            <Button type="submit" size="lg"><Search className="h-4 w-4" /> Search</Button>
          </form>

          {/* Live suggestions */}
          {searchSuggestions.length > 0 && (
            <div className="mt-3 max-w-2xl mx-auto text-left border rounded-xl overflow-hidden">
              {searchSuggestions.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-card hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md overflow-hidden bg-muted">
                      {p.imageUrl && p.imageUrl !== '/placeholder.svg' ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{p.description || ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/products/${p.id}?ref=404`} onClick={() => Analytics.ctaClick('suggestion_specs', `/products/${p.id}`)}>Specs</Link>
                    </Button>
                    <Button size="sm" variant="hero" asChild>
                      <Link to={`/customize?ref=404`} onClick={() => Analytics.ctaClick('suggestion_customize', '/customize')}>Customize</Link>
                    </Button>
                  </div>
                </div>
              ))}
              <div className="p-2 bg-background text-right">
                <Button variant="link" className="text-xs" asChild>
                  <Link to={`/catalog?search=${encodeURIComponent(term)}&ref=404`} onClick={() => Analytics.ctaClick('view_all_results', `/catalog?search=${encodeURIComponent(term)}`)}>View all results</Link>
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <Button asChild variant="hero" size="lg">
              <Link to="/customize?ref=404" onClick={() => Analytics.ctaClick('design_and_get_quote', '/customize')}><PencilLine className="h-4 w-4" /> Design & get quote</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/catalog?ref=404" onClick={() => Analytics.ctaClick('browse_products', '/catalog')}><Package className="h-4 w-4" /> Browse products</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/pricing?ref=404" onClick={() => Analytics.ctaClick('view_pricing', '/pricing')}><BadgeDollarSign className="h-4 w-4" /> View pricing</Link>
            </Button>
            {/* Samples CTA removed */}
            <Button asChild variant="outline" size="lg">
              <Link to="/designers?ref=404" onClick={() => Analytics.ctaClick('design_help', '/designers')}>Get design help</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/" onClick={() => Analytics.ctaClick('home', '/') }><Home className="h-4 w-4" /> Home</Link>
            </Button>
            {user ? (
              <Button asChild variant="outline" size="lg">
                <Link to="/dashboard" onClick={() => Analytics.ctaClick('dashboard', '/dashboard')}><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
              </Button>
            ) : null}
          </div>

          {/* Did you mean */}
          {routeHints.length > 0 && (
            <div className="mt-4 text-xs text-muted-foreground">
              <span className="uppercase tracking-wide mr-2">Did you mean</span>
              {routeHints.map((h, idx) => (
                <span key={h.to}>
                  {idx > 0 ? ', ' : ''}
                  <Link className="underline" to={`${h.to}?ref=404-dym`} onClick={() => Analytics.didYouMean(h.label, h.to)}>{h.label}</Link>
                </span>
              ))}
              ?
            </div>
          )}

          {/* Popular Categories */}
          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Popular categories</div>
            <div className="flex flex-wrap justify-center gap-2">
              {popularCategories.map(cat => (
                <Button key={cat} asChild variant="outline" size="sm">
                  <Link to={`/catalog?category=${encodeURIComponent(cat)}`} onClick={() => Analytics.categoryClick(cat)}>{cat}</Link>
                </Button>
              ))}
            </div>
          </div>

          {/* Featured Products */}
          <div className="mt-10 text-left">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 text-center">Featured products</div>
            <div className="grid gap-4 md:grid-cols-3">
              {(featured || []).map(p => (
                <Card key={p.id} className="overflow-hidden border border-primary/10">
                  <CardHeader className="p-0">
                    <div className="aspect-square bg-background">
                      {p.imageUrl && p.imageUrl !== '/placeholder.svg' ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">No image</div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="font-medium mb-1">{p.name}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description || ''}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-base font-medium">${Number(p.basePrice || 0).toFixed(2)}<span className="text-xs text-muted-foreground font-normal">/piece</span></div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/products/${p.id}`} onClick={() => Analytics.featuredClick('specs', p.id)}>Specs</Link>
                        </Button>
                        <Button size="sm" variant="hero" asChild>
                          <Link to="/customize" onClick={() => Analytics.featuredClick('customize', p.id)}>Customize</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={() => { try { Analytics.ctaClick('go_back', 'back'); } catch {}; navigate(-1); }}>
              <ArrowLeft className="h-4 w-4" /> Go back
            </Button>
          </div>

          <div className="mt-10 text-xs text-muted-foreground">
            <div>
              Missing something? Email us at <a className="underline" href="mailto:support@example.com">support@example.com</a>
              {" · "}
              <a className="underline" href={reportHref} onClick={() => Analytics.reportLink(reportHref)}>report this broken link</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
