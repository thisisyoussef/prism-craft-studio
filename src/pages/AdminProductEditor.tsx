import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  base_price: number | null;
  image_url: string | null;
}

interface Variant {
  id: string;
  product_id: string;
  color_name: string;
  color_hex: string;
  stock: number;
  price: number | null;
  image_url: string | null;
  active: boolean;
}

const AdminProductEditor = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { toast } = useToast();

  const isAdmin = profile?.role === "admin";

  const { data: product, isLoading: loadingProduct, error: productError } = useQuery<Product | null>({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, category, base_price, image_url")
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
    enabled: !!productId,
  });

  const { data: variants, isLoading: loadingVariants } = useQuery<Variant[]>({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      if (!productId) return [] as Variant[];
      const { data, error } = await (supabase as any)
        .from("product_variants")
        .select("id, product_id, color_name, color_hex, stock, price, image_url, active")
        .eq("product_id", productId)
        .order("color_name", { ascending: true });
      if (error) throw error;
      return (data as unknown as Variant[]) || [];
    },
    enabled: !!productId,
  });

  const upsertVariant = useMutation({
    mutationFn: async (v: Partial<Variant> & { product_id: string }) => {
      const payload: any = { ...v };
      if (!payload.id) delete payload.id;
      const { data, error } = await (supabase as any)
        .from("product_variants")
        .upsert(payload)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return data?.id as string | undefined;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-variants", productId] });
      toast({ title: "Saved", description: "Variant updated." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: String(err?.message || err), variant: "destructive" as any });
    },
  });

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("product_variants")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-variants", productId] });
      toast({ title: "Deleted", description: "Variant removed." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: String(err?.message || err), variant: "destructive" as any });
    },
  });

  if (loadingProfile || loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">You do not have access to this page.</p>
        <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Product not found.</p>
        <Button onClick={() => navigate("/admin/inventory")}>Back</Button>
      </div>
    );
  }

  const handleAddVariant = () => {
    if (!productId) return;
    upsertVariant.mutate({
      product_id: productId,
      color_name: "New Color",
      color_hex: "#000000",
      stock: 0,
      price: null,
      image_url: product.image_url ?? null,
      active: true,
    });
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/inventory")}> 
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Edit Product</h1>
            <p className="text-sm text-muted-foreground">{product.name}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium">Variants (Colors)</h2>
          <Button onClick={handleAddVariant} disabled={upsertVariant.isPending}>
            <Plus className="w-4 h-4 mr-2" /> Add Variant
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color Name</TableHead>
                <TableHead>Hex</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Price Override</TableHead>
                <TableHead>Image URL</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingVariants ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  </TableCell>
                </TableRow>
              ) : (variants || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No variants yet. Click "Add Variant" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                (variants || []).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Input
                        defaultValue={v.color_name}
                        className="h-8"
                        onBlur={(e) => {
                          const val = e.currentTarget.value.trim() || "Unnamed";
                          upsertVariant.mutate({ id: v.id, product_id: v.product_id, color_name: val });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          defaultValue={v.color_hex || "#000000"}
                          className="h-8 w-12 p-1"
                          onChange={(e) => {
                            const hex = e.currentTarget.value;
                            upsertVariant.mutate({ id: v.id, product_id: v.product_id, color_hex: hex });
                          }}
                        />
                        <Input
                          defaultValue={v.color_hex}
                          placeholder="#000000"
                          className="h-8 w-28"
                          onBlur={(e) => {
                            let hex = e.currentTarget.value.trim();
                            if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) return;
                            if (!hex.startsWith('#')) hex = `#${hex}`;
                            upsertVariant.mutate({ id: v.id, product_id: v.product_id, color_hex: hex });
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: v.color_hex || '#000000' }} />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={String(v.stock ?? 0)}
                        className="h-8 w-24"
                        onBlur={(e) => {
                          const val = Number(e.currentTarget.value);
                          const safe = Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
                          upsertVariant.mutate({ id: v.id, product_id: v.product_id, stock: safe });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={v.price == null ? '' : String(v.price)}
                        className="h-8 w-28"
                        placeholder={`Base ${product.base_price ?? ''}`}
                        onBlur={(e) => {
                          const str = e.currentTarget.value.trim();
                          const num = str === '' ? null : Number(str);
                          if (num !== null && !Number.isFinite(num)) return;
                          upsertVariant.mutate({ id: v.id, product_id: v.product_id, price: num });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={v.image_url ?? ''}
                        className="h-8"
                        placeholder="https://..."
                        onBlur={(e) => {
                          const url = e.currentTarget.value.trim() || null;
                          upsertVariant.mutate({ id: v.id, product_id: v.product_id, image_url: url });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={!!v.active}
                        onCheckedChange={(checked) =>
                          upsertVariant.mutate({ id: v.id, product_id: v.product_id, active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteVariant.mutate(v.id)}
                        disabled={deleteVariant.isPending}
                        title="Delete variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminProductEditor;
