import { useEffect, useMemo } from "react";
import Navigation from "@/components/Navigation";
import { useOrderStore, useAuthStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ScrollReveal, ScrollStagger } from "@/components/ScrollReveal";
import SEO from "@/components/SEO";
import { getCanonicalUrl } from "@/lib/seo";

const Dashboard = () => {
  const { user, loading } = useAuthStore();
  const { orders, samples, fetchOrders, fetchSamples } = useOrderStore();

  useEffect(() => {
    // Load user-specific data when authenticated
    if (user) {
      fetchOrders();
      fetchSamples();
    }
  }, [user, fetchOrders, fetchSamples]);

  const hasAnyData = useMemo(() => (orders?.length || 0) + (samples?.length || 0) > 0, [orders?.length, samples?.length]);

  return (
    <div className="relative min-h-screen bg-background">
      <SEO title="Your account" canonicalUrl={getCanonicalUrl('/dashboard')} noindex />
      <Navigation />
      <div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
        <ScrollReveal variant="fade-up" distancePx={18}>
          <h1 className="text-3xl font-medium text-foreground mb-4">Your account</h1>
        </ScrollReveal>
        {!user ? (
          <ScrollReveal variant="fade-up" delayMs={80}>
            <div className="text-muted-foreground">Sign in to see your orders.</div>
          </ScrollReveal>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <ScrollReveal asChild variant="fade-up">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-medium">Your orders</h2>
                  <Button variant="outline" size="sm" onClick={() => fetchOrders()} disabled={loading}>Refresh</Button>
                </div>
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : (orders?.length || 0) === 0 ? (
                  <div className="text-sm text-muted-foreground">No orders placed yet.</div>
                ) : (
                <ScrollStagger intervalMs={50}>
                  <div className="space-y-2">
                    {orders.slice(0, 5).map((o: any) => (
                      <Link key={o.id} to={`/orders/${o.id}`} className="block border rounded p-3 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center justify-between text-sm">
                          <div className="font-medium">Order #{o.order_number || o.id}</div>
                          <div className="text-muted-foreground">${(Number(o.total_amount) || 0).toFixed(2)}</div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <div className="uppercase">{o.status}</div>
                          <div>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollStagger>
                )}
              </Card>
            </ScrollReveal>

            <ScrollReveal asChild variant="fade-up" delayMs={120}>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-medium">Sample orders</h2>
                  <Button variant="outline" size="sm" onClick={() => fetchSamples()} disabled={loading}>Refresh</Button>
                </div>
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : (samples?.length || 0) === 0 ? (
                  <div className="text-sm text-muted-foreground">No samples ordered yet.</div>
                ) : (
                <ScrollStagger intervalMs={50}>
                  <div className="space-y-2">
                    {samples.slice(0, 5).map((s: any) => (
                      <div key={s.id} className="border rounded p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Sample #{s.id.slice(0, 8)}</div>
                          <div className="text-muted-foreground">${(Number(s.total_amount) || 0).toFixed(2)}</div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <div className="uppercase">{s.status}</div>
                          <div>{s.created_at ? new Date(s.created_at).toLocaleString() : '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollStagger>
                )}
              </Card>
            </ScrollReveal>

            {!hasAnyData ? (
              <ScrollReveal variant="fade-up" delayMs={160}>
                <div className="md:col-span-2 text-sm text-muted-foreground">
                  Start by browsing our catalog or ordering samples to see the quality.
                </div>
              </ScrollReveal>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

