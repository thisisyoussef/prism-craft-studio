import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

const statuses = [
  "draft",
  "pending",
  "confirmed",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
];

interface Order {
  id: string;
  order_number: string | null;
  company_id: string | null;
  user_id: string;
  product_id: string | null;
  quantity: number;
  total_amount: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  products?: { name: string | null; image_url: string | null } | null;
}

interface ProductionUpdate {
  id: string;
  order_id: string;
  stage: string;
  status: string;
  description: string | null;
  photos: any | null;
  estimated_completion: string | null;
  actual_completion: string | null;
  created_at: string;
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { toast } = useToast();

  const { data: order, isLoading: loadingOrder } = useQuery<Order | null>({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("id, order_number, company_id, user_id, product_id, quantity, total_amount, status, notes, created_at, updated_at, products(name, image_url)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Order | null;
    },
    enabled: !!id,
  });

  const { data: updates } = useQuery<ProductionUpdate[]>({
    queryKey: ["admin-order-updates", id],
    queryFn: async () => {
      if (!id) return [] as ProductionUpdate[];
      const { data, error } = await (supabase as any)
        .from("production_updates")
        .select("id, order_id, stage, status, description, photos, estimated_completion, actual_completion, created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ProductionUpdate[];
    },
    enabled: !!id,
  });

  const updateOrder = useMutation({
    mutationFn: async (patch: Partial<Order>) => {
      if (!id) return;
      const { error } = await (supabase as any)
        .from("orders")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
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

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Order not found.</p>
        <Button onClick={() => navigate("/admin/orders")}>Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/orders")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Order {order.order_number || order.id}</h1>
            <p className="text-sm text-muted-foreground">{order.products?.name || order.product_id || 'Product'} • Qty {order.quantity}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={order.status} onValueChange={(val) => updateOrder.mutate({ status: val })}>
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
                defaultValue={order.notes ?? ''}
                placeholder="Internal notes"
                onBlur={(e) => updateOrder.mutate({ notes: e.currentTarget.value })}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-medium mb-2">Status Timeline</h2>
          <div className="flex flex-col gap-2">
            {statuses.map((s, idx) => {
              const reached = statuses.indexOf(order.status) >= idx;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${reached ? 'bg-primary' : 'bg-muted'} border`} />
                  <div className="text-sm">{s.split('_').join(' ')}</div>
                </div>
              );
            })}
          </div>
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
      </div>
    </div>
  );
}
