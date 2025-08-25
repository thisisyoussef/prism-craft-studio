import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { serverErrorMessage } from "@/lib/errors";

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  base_price: number | null;
  image_url: string | null;
  available_colors: string[] | null;
  available_sizes: string[] | null;
  customization_options: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export default function AdminInventory() {
  const navigate = useNavigate();
  const { data: profile, isLoading: loadingProfile } = useProfile();

  // Simple guard: only admins can view
  const isAdmin = profile?.role === "admin";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, refetch, isFetching } = useQuery<{ rows: ProductRow[]; total: number; categories: string[] }>({
    queryKey: ["admin-inventory", { page, pageSize }],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Fetch page of products
      const { data, error, count } = await supabase
        .from("products")
        .select("*", { count: "exact" })
        .range(from, to)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch categories (simple distinct query)
      const { data: cats, error: catErr } = await supabase
        .from("products")
        .select("category");
      if (catErr) throw catErr;
      const categories = Array.from(new Set((cats || []).map((c: any) => c.category).filter(Boolean)));

      return { rows: (data as ProductRow[]) || [], total: count || 0, categories };
    },
  });

  const filtered = useMemo(() => {
    const rows = data?.rows || [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery = !q || r.name.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
      const matchesCat = category === "all" || (r.category || "").toLowerCase() === category.toLowerCase();
      return matchesQuery && matchesCat;
    });
  }, [data?.rows, query, category]);

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">You do not have access to this page.</p>
        <Button variant="default" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));

  const { toast } = useToast();

  // Mutation to update customization_options for a product
  const updateOptions = useMutation({
    mutationFn: async (args: { productId: string; patch: Record<string, any> }) => {
      const { productId, patch } = args;
      // Validate incoming patch to avoid bad writes
      const OptionPatchSchema = z.object({
        sku: z.string().trim().min(1, 'SKU is required').max(64).optional(),
        stock: z.number().int().min(0).optional(),
        active: z.boolean().optional(),
      })
      const parsed = OptionPatchSchema.safeParse(patch)
      if (!parsed.success) {
        throw new Error(parsed.error.issues.map(i => i.message).join('\n'))
      }
      // Fetch existing options to merge on server
      const { data: existing, error: fetchErr } = await supabase
        .from("products")
        .select("customization_options")
        .eq("id", productId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      const baseOpts = ((): Record<string, any> => {
        const raw = (existing as any)?.customization_options;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, any>;
        return {};
      })();
      const next = { ...baseOpts, ...patch };
      const { error: updErr } = await supabase
        .from("products")
        .update({ customization_options: next })
        .eq("id", productId);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Saved", description: "Inventory updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: serverErrorMessage(err, 'Unable to save changes'), variant: "destructive" as any });
    }
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Inventory</h1>
            <p className="text-sm text-muted-foreground">Manage product catalog for B2B orders</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory as any}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(data?.categories || []).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Colors</TableHead>
                <TableHead>Sizes</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const opts = (p.customization_options as Record<string, any>) || {};
                  const sku: string = typeof opts.sku === 'string' ? opts.sku : '';
                  const stock: number = typeof opts.stock === 'number' ? opts.stock : 0;
                  const active: boolean = typeof opts.active === 'boolean' ? opts.active : true;
                  return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                    </TableCell>
                    <TableCell>{p.category || "-"}</TableCell>
                    <TableCell>${Number(p.base_price || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {(p.available_colors || []).slice(0, 5).map((c) => (
                          <Badge key={c} variant="secondary">{c}</Badge>
                        ))}
                        {((p.available_colors || []).length || 0) > 5 ? (
                          <Badge variant="outline">+{(p.available_colors || []).length - 5}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(p.available_sizes || []).map((s) => (
                          <Badge key={s} variant="outline">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={sku}
                        placeholder="SKU"
                        className="h-8 w-32"
                        disabled={updateOptions.isPending}
                        onBlur={(e) => {
                          const val = e.currentTarget.value.trim();
                          updateOptions.mutate({ productId: p.id, patch: { sku: val } });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={String(stock)}
                        className="h-8 w-24"
                        disabled={updateOptions.isPending}
                        onBlur={(e) => {
                          const val = Number(e.currentTarget.value);
                          const safe = Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
                          updateOptions.mutate({ productId: p.id, patch: { stock: safe } });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={!!active}
                        disabled={updateOptions.isPending}
                        onCheckedChange={(checked) => {
                          updateOptions.mutate({ productId: p.id, patch: { active: checked } });
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/inventory/${p.id}`)}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/new?productId=${p.id}`)}>
                        Create Order
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
