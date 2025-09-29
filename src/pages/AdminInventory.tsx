import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { serverErrorMessage } from "@/lib/errors";
import Navigation from "@/components/Navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { listProducts, updateProduct as apiUpdateProduct, deleteProduct as apiDeleteProduct, type ApiProduct } from "@/lib/services/productService";
import { listByProductIds, type ApiVariant } from "@/lib/services/variantService";
import api from "@/lib/api";

type ProductRow = ApiProduct;

export default function AdminInventory() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  // Simple guard: only admins can view
  const isAdmin = user?.role === "admin";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, refetch, isFetching } = useQuery<{ rows: ProductRow[]; total: number; categories: string[] }>({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const products = await listProducts();
      const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
      return { rows: products, total: products.length, categories };
    },
  });

  // Pull variants to derive color chips per product
  const { data: variants } = useQuery<ApiVariant[]>({
    enabled: !!(data?.rows?.length),
    queryKey: ["admin-inventory-variants", (data?.rows || []).map(p => p.id).join(",")],
    queryFn: async () => {
      const ids = (data?.rows || []).map(p => p.id);
      if (ids.length === 0) return [] as ApiVariant[];
      return await listByProductIds(ids);
    },
  });

  // Map productId -> color chips from active variants
  const colorsByProduct = useMemo(() => {
    const map = new Map<string, { name: string; hex: string }[]>();
    const list = variants || [];
    for (const v of list) {
      if (v.active === false) continue;
      const name = (v.colorName || '').trim();
      if (!name) continue;
      const hex = v.colorHex || '#ffffff';
      const arr = map.get(v.productId) || [];
      if (!arr.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        arr.push({ name, hex });
        map.set(v.productId, arr);
      }
    }
    return map;
  }, [variants]);

  // Note: active flag currently lives in customization_options.active in this schema

  // Mutation to delete a product
  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      await apiDeleteProduct(productId);
    },
    onMutate: async (productId: string) => {
      const key = ["admin-inventory"];
      await qc.cancelQueries({ queryKey: key as any });
      const prev = qc.getQueryData(key as any) as { rows: ProductRow[]; total: number; categories: string[] } | undefined;
      if (prev) {
        const rows = prev.rows.filter(r => r.id !== productId);
        const next = { ...prev, rows, total: Math.max(0, (prev.total || 1) - 1) };
        qc.setQueryData(key as any, next);
      }
      return { prev } as const;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inventory"] as any });
      qc.invalidateQueries({ queryKey: ["catalog-products"] as any });
      toast({ title: "Deleted", description: "Product removed." });
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-inventory"] as any, ctx.prev);
      toast({ title: "Delete failed", description: serverErrorMessage(err, 'Unable to delete product'), variant: "destructive" as any });
    }
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

  if (!isAdmin) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-muted-foreground">You do not have access to this page.</p>
          <Button variant="default" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </>
    );
  }

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));

  const { toast } = useToast();

  // Mutation to update product fields (name, description, etc.)
  const updateProduct = useMutation({
    mutationFn: async (args: { productId: string; updates: Partial<ProductRow> }) => {
      const { productId, updates } = args;
      await apiUpdateProduct(productId, updates as any);
    },
    onMutate: async ({ productId, updates }) => {
      const key = ["admin-inventory", { page, pageSize }];
      await qc.cancelQueries({ queryKey: key as any });
      const prev = qc.getQueryData(["admin-inventory"] as any) as { rows: ProductRow[]; total: number; categories: string[] } | undefined;
      if (prev) {
        const rows = prev.rows.map(r => r.id === productId ? { ...r, ...updates } as ProductRow : r);
        qc.setQueryData(["admin-inventory"] as any, { ...prev, rows });
      }
      return { prev } as const;
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ["catalog-products"] as any });
      toast({ title: "Saved", description: "Product updated successfully." });
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-inventory"] as any, ctx.prev);
      toast({ title: "Save failed", description: serverErrorMessage(err, 'Unable to save changes'), variant: "destructive" as any });
    }
  });

  // Mutation to update customization_options for a product
  const updateOptions = useMutation({
    mutationFn: async (args: { productId: string; patch: Record<string, any> }) => {
      const { productId, patch } = args;
      const OptionPatchSchema = z.object({
        sku: z.string().trim().min(1, 'SKU is required').max(64).optional(),
        stock: z.number().int().min(0).optional(),
        active: z.boolean().optional(),
      })
      const parsed = OptionPatchSchema.safeParse(patch)
      if (!parsed.success) throw new Error(parsed.error.issues.map(i => i.message).join('\n'))

      // Handle active as top-level and sku/stock under specifications
      if (typeof patch.active === 'boolean') {
        await apiUpdateProduct(productId, { active: patch.active } as any);
      }
      const specPatch: Record<string, any> = {};
      if (typeof patch.sku !== 'undefined') specPatch.sku = patch.sku;
      if (typeof patch.stock !== 'undefined') specPatch.stock = patch.stock;
      if (Object.keys(specPatch).length) {
        // Merge by fetching current product from cache
        const cache = qc.getQueryData(["admin-inventory"]) as { rows: ProductRow[]; total: number; categories: string[] } | undefined;
        const existing = cache?.rows.find(r => r.id === productId);
        const baseSpecs = (existing?.specifications && typeof existing.specifications === 'object') ? existing.specifications : {};
        await apiUpdateProduct(productId, { specifications: { ...baseSpecs, ...specPatch } } as any);
      }
    },
    onMutate: async ({ productId, patch }) => {
      const key = ["admin-inventory"];
      await qc.cancelQueries({ queryKey: key as any });
      const prev = qc.getQueryData(key as any) as { rows: ProductRow[]; total: number; categories: string[] } | undefined;
      if (prev) {
        const rows = prev.rows.map(r => {
          if (r.id !== productId) return r;
          const baseSpecs = (r.specifications && typeof r.specifications === 'object') ? r.specifications : {};
          const next: ProductRow = {
            ...r,
            specifications: { ...baseSpecs, ...patch },
            active: typeof patch.active === 'boolean' ? patch.active : r.active,
          } as ProductRow;
          return next;
        });
        qc.setQueryData(key as any, { ...prev, rows });
      }
      return { prev } as const;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inventory"] as any });
      qc.invalidateQueries({ queryKey: ["catalog-products"] as any });
      toast({ title: "Saved", description: "Inventory updated successfully." });
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-inventory"] as any, ctx.prev);
      toast({ title: "Save failed", description: serverErrorMessage(err, 'Unable to save changes'), variant: "destructive" as any });
    }
  });

  return (
    <>
      <Navigation />
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
            <Button onClick={() => navigate("/admin/inventory/new", { state: { from: "/admin/inventory" } })}>
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
                  const specs = (p.specifications as Record<string, any>) || {};
                  const sku: string = typeof specs.sku === 'string' ? specs.sku : '';
                  const stock: number = typeof specs.stock === 'number' ? specs.stock : 0;
                  const active: boolean = typeof p.active === 'boolean' ? p.active : true;
                  return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Input
                        defaultValue={p.name}
                        className="font-medium border-none p-0 h-auto bg-transparent focus:bg-background focus:border-input"
                        disabled={updateProduct.isPending}
                        onBlur={(e) => {
                          const newName = e.currentTarget.value.trim();
                          if (newName && newName !== p.name) {
                            updateProduct.mutate({ productId: p.id, updates: { name: newName } });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                    </TableCell>
                    <TableCell>{p.category || "-"}</TableCell>
                    <TableCell>${Number(p.basePrice || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {(colorsByProduct.get(p.id) || []).slice(0, 5).map((c) => (
                          <Badge key={`${p.id}-${c.name}`} variant="secondary">{c.name}</Badge>
                        ))}
                        {(((colorsByProduct.get(p.id) || []).length) || 0) > 5 ? (
                          <Badge variant="outline">+{(colorsByProduct.get(p.id)!.length - 5)}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(p.sizes || []).map((s) => (
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
                        onClick={() => navigate(`/admin/inventory/${p.id}`, { state: { from: "/admin/inventory" } })}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/customize?productId=${p.id}`)}>
                        Create Order
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" disabled={deleteProduct.isPending}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete product?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the product and its variants. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => deleteProduct.mutate(p.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
    </>
  );
}
