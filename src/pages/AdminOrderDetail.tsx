import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { sendOrderUpdateEmail } from "@/lib/email";
import Navigation from "@/components/Navigation";
import { OrderService } from "@/lib/services/orderServiceNode";
import type { Order, ProductionUpdate } from "@/lib/types/order";

const statuses = [
  'submitted',
  'paid',
  'in_production',
  'shipping',
  'delivered',
];

// Use shared types from lib/types/order

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const qc = useQueryClient();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { toast } = useToast();

  const { data: order, isLoading: loadingOrder } = useQuery<Order | null>({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      if (!id) return null;
      return await OrderService.getOrder(id);
    },
    enabled: !!id,
  });

  // Shipping fields local state
  const [tracking, setTracking] = useState<string>("");
  const [eta, setEta] = useState<string>(""); // yyyy-MM-dd
  useEffect(() => {
    if (order) {
      setTracking(order.tracking_number || "");
      setEta(order.estimated_delivery ? String(order.estimated_delivery).slice(0, 10) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.tracking_number, order?.estimated_delivery]);

  // Customer email is not available from Node order by default
  const customerEmail = undefined as string | undefined;

  const { data: payments } = useQuery<any[]>({
    queryKey: ["admin-order-payments", id],
    queryFn: async () => {
      if (!id) return [];
      return await OrderService.getOrderPayments(id);
    },
    enabled: !!id,
  });

  const { data: updates } = useQuery<ProductionUpdate[]>({
    queryKey: ["admin-order-updates", id],
    queryFn: async () => {
      if (!id) return [] as ProductionUpdate[];
      return await OrderService.getOrderProductionUpdates(id);
    },
    enabled: !!id,
  });

  const updateOrder = useMutation({
    mutationFn: async (patch: Partial<Order>) => {
      if (!id) return;
      await OrderService.updateOrder(id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-order", id] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Saved", description: "Order updated." });
    },
    onError: (err: any) => toast({ title: "Failed", description: String(err?.message || err), variant: "destructive" as any }),
  });

  if (loadingProfile || loadingOrder) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-muted-foreground">You do not have access to this page.</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-muted-foreground">Order not found.</p>
          <Button onClick={() => navigate(location.state?.from || "/admin/orders", { replace: true })}>Back</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(location.state?.from || "/admin/orders", { replace: true });
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Order {order.order_number || order.id}</h1>
            <p className="text-sm text-muted-foreground">{order.product_name || order.product_id || 'Product'} • Qty {order.quantity}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={order.status}
                onValueChange={(val) =>
                  updateOrder.mutate(
                    { status: val as any },
                    {
                      onSuccess: async () => {
                        try {
                          if (customerEmail) {
                            await sendOrderUpdateEmail(customerEmail, {
                              order_number: order.order_number || order.id,
                              order_id: order.id,
                              status: val,
                              notes: (order as any).notes || null,
                            });
                            toast({ title: "Customer Notified", description: "Update email sent." });
                          }
                        } catch (_e) {
                          // Preview already logged in helper
                        }
                      },
                    }
                  )
                }
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (<SelectItem key={s} value={s}>{s.split('_').join(' ')}</SelectItem>))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Updated {format(new Date(order.updated_at), 'yyyy-MM-dd HH:mm')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <Input
                defaultValue={(order as any).admin_notes ?? ''}
                placeholder="Internal notes"
                onBlur={(e) => updateOrder.mutate({ admin_notes: e.currentTarget.value } as any)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Shipping</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Tracking Number</div>
                <Input
                  value={tracking}
                  placeholder="e.g. 1Z..."
                  onChange={(e) => setTracking(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Estimated Delivery</div>
                <Input
                  type="date"
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                />
              </div>
              <div className="pt-1">
                <Button
                  variant="secondary"
                  disabled={!order}
                  onClick={async () => {
                    if (!order) return;
                    try {
                      await OrderService.updateOrderStatus(order.id, order.status, {
                        trackingNumber: tracking || undefined,
                        estimatedDelivery: eta || undefined,
                      });
                      qc.invalidateQueries({ queryKey: ["admin-order", order.id] });
                      toast({ title: "Saved", description: "Shipping details updated." });
                    } catch (e: any) {
                      toast({ title: "Failed", description: String(e?.message || e), variant: "destructive" as any });
                    }
                  }}
                >
                  Save Shipping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Design Preview */}
        <div className="mb-6">
          <Card>
            <CardHeader><CardTitle>Design Preview</CardTitle></CardHeader>
            <CardContent>
              {((order as any).mockup_images && (((order as any).mockup_images.front) || ((order as any).mockup_images.back))) ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {((order as any).mockup_images.front) ? (
                    <div className="border rounded p-2 bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={(order as any).mockup_images.front} alt="Front mockup" className="w-full h-28 object-cover rounded" />
                      <div className="mt-1 text-xs text-muted-foreground">Front</div>
                    </div>
                  ) : null}
                  {((order as any).mockup_images.back) ? (
                    <div className="border rounded p-2 bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={(order as any).mockup_images.back} alt="Back mockup" className="w-full h-28 object-cover rounded" />
                      <div className="mt-1 text-xs text-muted-foreground">Back</div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No design previews.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">Product</div>
              <div className="text-sm">{order.product_category} • {order.product_name}</div>
              <div className="text-sm">Quantity: {order.quantity}</div>
              <div className="text-sm">Total: ${Number(order.total_amount || 0).toFixed(2)}</div>
              {order.guest_email && (
                <div className="text-sm">Guest Email: <span className="font-medium">{order.guest_email}</span></div>
              )}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Colors</div>
                <div className="flex flex-wrap gap-2">
                  {(order.colors || []).length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    order.colors.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-muted text-xs">{c}</span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Sizes</div>
                {(Object.keys(order.sizes || {}).length === 0) ? (
                  <div className="text-xs text-muted-foreground">—</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(order.sizes || {}).map(([sz, qty]) => (
                      <span key={sz} className="px-2 py-0.5 rounded border text-xs">{sz}: {qty as any}</span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Print & Artwork</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Print locations</div>
                {(order.print_locations || []).length === 0 ? (
                  <div className="text-xs text-muted-foreground">—</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {order.print_locations.map((pl) => (
                      <span key={pl.id} className="px-2 py-0.5 rounded bg-muted text-xs">{pl.location}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Artwork files</div>
                {(order.artwork_files || []).length === 0 ? (
                  <div className="text-xs text-muted-foreground">—</div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {order.artwork_files.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-xs underline">
                        {url.split('/').pop() || `file-${idx+1}`}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-2">Production Updates</h2>
          <div className="space-y-3">
            {(updates || []).map(u => (
              <Card key={u.id}>
                <CardHeader>
                  <CardTitle className="text-base">{u.stage} • {u.status}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-2">{format(new Date(u.created_at), 'yyyy-MM-dd HH:mm')}</div>
                  {u.description && <div className="text-sm">{u.description}</div>}
                </CardContent>
              </Card>
            ))}
            {(updates || []).length === 0 && (
              <div className="text-sm text-muted-foreground">No updates yet.</div>
            )}
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Customer Communication</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={!customerEmail}
                onClick={async () => {
                  try {
                    if (!customerEmail) return;
                    await sendOrderUpdateEmail(customerEmail, {
                      order_number: order.order_number || order.id,
                      order_id: order.id,
                      status: order.status || undefined,
                      notes: (order as any).notes || null,
                    });
                    toast({ title: "Resent", description: "Order update email resent." });
                  } catch (_e) {}
                }}
              >
                Resend Update Email
              </Button>

              <Button
                variant="outline"
                disabled={!order.guest_email}
                onClick={async () => {
                  try {
                    await OrderService.resendGuestAccessLink(order.id);
                    toast({ title: "Sent", description: `Guest access link sent to ${order.guest_email}` });
                  } catch (e: any) {
                    toast({ title: "Failed", description: String(e?.message || e), variant: "destructive" as any });
                  }
                }}
              >
                Resend Guest Access Link
              </Button>

              <Button
                onClick={async () => {
                  try {
                    const { url } = await OrderService.createCheckout(order.id, 'full_payment');
                    toast({ title: "Checkout Created", description: url ? `Link: ${url}` : "Created via Stripe" });
                    if (url) window.open(url, '_blank');
                  } catch (e: any) {
                    toast({ title: "Failed", description: String(e?.message || e), variant: "destructive" as any });
                  }
                }}
              >
                Create Checkout
              </Button>

              {/* Resend invoice via Supabase removed in Node migration */}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </>
  );
}
