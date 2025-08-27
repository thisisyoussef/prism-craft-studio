import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// Using a lightweight range type to avoid strict DateRange requirements
type Range = { from?: Date; to?: Date };
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface OrderRow {
  id: string;
  order_number: string | null;
  company_id: string | null;
  user_id: string;
  product_id: string | null;
  quantity: number;
  total_amount: number | null;
  status: string | null;
  created_at: string;
  labels?: string[] | null;
  notes?: string | null;
  product?: { name: string | null; image_url?: string | null } | null;
}

const statuses = [
  "draft",
  "pending",
  "confirmed",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
];

export default function AdminOrders() {
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [status, setStatus] = useState<string>("all");
  const [customer, setCustomer] = useState("");
  const [range, setRange] = useState<Range | undefined>();

  const { data: orders, isLoading, error } = useQuery<OrderRow[]>({
    queryKey: ["admin-orders", status, customer, range?.from?.toISOString(), range?.to?.toISOString()],
    enabled: !!profile && !loadingProfile,
    queryFn: async () => {
      let q = (supabase as any)
        .from("orders")
        .select("id, order_number, company_id, user_id, product_id, quantity, total_amount, status, created_at, labels, notes, product:products!orders_product_id_fkey(name, image_url)")
        .order("created_at", { ascending: false });
      if (status && status !== 'all') q = q.eq("status", status);
      if (customer) q = q.ilike("order_number", `%${customer}%`);
      if (range?.from) q = q.gte("created_at", range.from.toISOString());
      if (range?.to) q = q.lte("created_at", range.to.toISOString());
      const { data, error } = await q;
      if (error) {
        console.error("AdminOrders query error:", error);
        throw error;
      }
      return (data || []) as OrderRow[];
    },
  });

  // Batch-load customer profiles for display
  const [profilesMap, setProfilesMap] = useState<Record<string, { first_name: string | null; last_name: string | null; email: string | null; phone: string | null }>>({});
  useEffect(() => {
    const run = async () => {
      try {
        const ids = Array.from(new Set((orders || []).map(o => o.user_id))).filter(Boolean);
        if (!ids.length) { setProfilesMap({}); return }
        const { data, error } = await (supabase as any)
          .from('profiles')
          .select('user_id, first_name, last_name, email, phone')
          .in('user_id', ids);
        if (!error && Array.isArray(data)) {
          const next: any = {};
          for (const p of data) next[p.user_id] = { first_name: p.first_name, last_name: p.last_name, email: p.email, phone: p.phone };
          setProfilesMap(next);
        }
      } catch {}
    }
    run()
  }, [JSON.stringify((orders || []).map(o => o.user_id).sort())]);

  // Batch-load products for display (fallback if embed fails)
  const [productsMap, setProductsMap] = useState<Record<string, { name: string | null; image_url: string | null }>>({});
  useEffect(() => {
    const run = async () => {
      try {
        const ids = Array.from(new Set((orders || []).map(o => o.product_id))).filter(Boolean) as string[];
        if (!ids.length) { setProductsMap({}); return }
        const { data, error } = await (supabase as any)
          .from('products')
          .select('id, name, image_url')
          .in('id', ids);
        if (!error && Array.isArray(data)) {
          const next: any = {};
          for (const p of data) next[p.id] = { name: p.name, image_url: p.image_url };
          setProductsMap(next);
        }
      } catch {}
    }
    run()
  }, [JSON.stringify((orders || []).map(o => o.product_id).sort())]);

  // Inline edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [editStatus, setEditStatus] = useState<string | undefined>(undefined);
  const [editNotes, setEditNotes] = useState<string>("");
  const [editLabels, setEditLabels] = useState<string>("");

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order updated", description: "Status updated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err?.message || "Unknown error", variant: "destructive" });
    },
  });

  const saveEdits = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const patch: any = {};
      if (editStatus && editStatus !== selected.status) patch.status = editStatus;
      patch.notes = editNotes;
      patch.labels = editLabels.split(',').map(s => s.trim()).filter(Boolean);
      const { error } = await (supabase as any)
        .from('orders')
        .update(patch)
        .eq('id', selected.id);
      if (error) throw error;

      // If status changed, also log a production update to keep timeline consistent
      if (patch.status && patch.status !== selected.status) {
        try {
          await (supabase as any)
            .from('production_updates')
            .insert({
              order_id: selected.id,
              stage: patch.status,
              status: 'updated',
              description: (patch.notes || '').slice(0, 2000) || null,
              photos: null,
            })
        } catch (e) {
          console.warn('Failed to insert production update from AdminOrders', e)
        }
      }

      // Send email if status changed and we have a customer email
      const prof = profilesMap[selected.user_id];
      if (patch.status && prof?.email) {
        const payload = {
          order_number: selected.order_number || selected.id,
          status: patch.status,
          notes: patch.notes || '',
          explanation: `Your order status changed to ${patch.status.replace(/_/g, ' ')}.`,
        };
        try {
          const res = await (supabase as any).functions.invoke('send-email', { body: { type: 'order_update', to: prof.email, payload } });
          if (res?.error) {
            console.warn('order_update email failed:', res.error);
          } else {
            console.log('order_update email sent:', { to: prof.email, order: payload.order_number, status: payload.status });
          }
        } catch (e) {
          console.warn('order_update email invoke error:', e);
        }
      }
    },
    onSuccess: async () => {
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: 'Saved', description: 'Order updated.' });
    },
    onError: (err: any) => toast({ title: 'Failed', description: String(err?.message || err), variant: 'destructive' }),
  });

  const openEdit = (o: OrderRow) => {
    setSelected(o);
    setEditStatus(o.status || undefined);
    setEditNotes(o.notes || '');
    setEditLabels((o.labels || []).join(', '));
    setEditOpen(true);
  };

  const statusColor = (s?: string | null) => {
    switch (s) {
      case 'draft': return 'bg-gray-200 text-gray-900';
      case 'pending': return 'bg-amber-200 text-amber-900';
      case 'confirmed': return 'bg-blue-200 text-blue-900';
      case 'in_production': return 'bg-purple-200 text-purple-900';
      case 'shipped': return 'bg-cyan-200 text-cyan-900';
      case 'delivered': return 'bg-green-200 text-green-900';
      case 'cancelled': return 'bg-red-200 text-red-900';
      default: return 'bg-muted text-foreground';
    }
  };

  const kpis = useMemo(() => {
    const list = orders || [];
    const totalRevenue = list.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const inProd = list.filter((o) => o.status === "in_production").length;
    const open = list.filter((o) => !["delivered", "cancelled"].includes(o.status || '')).length;
    return { count: list.length, revenue: totalRevenue, inProd, open };
  }, [orders]);

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">You do not have access to this page.</p>
        <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {error ? (
        <div className="mb-4 text-sm text-red-600">
          Failed to load orders: {(error as any)?.message || 'Unknown error'}
        </div>
      ) : null}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage orders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader><CardTitle>Total Orders</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{kpis.count}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Open Orders</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{kpis.open}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>In Production</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{kpis.inProd}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">${kpis.revenue.toFixed(2)}</CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {statuses.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Customer</label>
            <Input value={customer} onChange={(e) => setCustomer(e.currentTarget.value)} placeholder="Search..." className="w-56" />
          </div>
          {/* TODO: Add proper date range picker UI. For now, manual ISO input placeholders. */}
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="datetime-local" onChange={(e) => setRange((r) => ({ ...(r||{}), from: e.currentTarget.value ? new Date(e.currentTarget.value) : undefined }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="datetime-local" onChange={(e) => setRange((r) => ({ ...(r||{}), to: e.currentTarget.value ? new Date(e.currentTarget.value) : undefined }))} />
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
              ) : (orders || []).length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>
              ) : (
                (orders || []).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.order_number || '—'}</TableCell>
                    <TableCell>
                      <Badge className={statusColor(o.status)}>{(o.status || '').split('_').join(' ') || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {(() => { const p = profilesMap[o.user_id]; const name = [p?.first_name, p?.last_name].filter(Boolean).join(' '); return <span>{name || '—'}</span>; })()}
                        <span className="text-xs text-muted-foreground">{profilesMap[o.user_id]?.email || '—'}</span>
                        {profilesMap[o.user_id]?.phone ? (
                          <span className="text-xs text-muted-foreground">{profilesMap[o.user_id]?.phone}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{o.product?.name || productsMap[o.product_id as string]?.name || o.product_id || '—'}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>${Number(o.total_amount || 0).toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(o.created_at), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-1">
                          {(o.labels || []).map((lab, i) => (
                            <Badge key={i} variant="secondary">{lab}</Badge>
                          ))}
                        </div>
                        {o.notes ? (
                          <div className="text-xs text-muted-foreground line-clamp-2 max-w-[280px]">{o.notes}</div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => openEdit(o)}>Edit</Button>
                        <Button size="sm" onClick={() => navigate(`/orders/${o.id}`)}>View</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Order {selected?.order_number || selected?.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <div className="text-sm mb-1">Status</div>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => (<SelectItem key={s} value={s}>{s.split('_').join(' ')}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm mb-1">Labels (comma-separated)</div>
                <Input value={editLabels} onChange={(e) => setEditLabels(e.currentTarget.value)} placeholder="priority, rush, design-review" />
              </div>
              <div>
                <div className="text-sm mb-1">Notes (sent in email)</div>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.currentTarget.value)} placeholder="Optional message to customer" rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={() => saveEdits.mutate()} disabled={saveEdits.status === 'pending'}>{saveEdits.status === 'pending' ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
