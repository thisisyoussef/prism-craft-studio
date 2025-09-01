/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ArrowLeft, Upload, Download, Copy } from "lucide-react";

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
  front_image_url: string | null;
  back_image_url: string | null;
  sleeve_image_url: string | null;
  active: boolean;
}

const AdminProductEditor = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const location = useLocation() as { state?: { from?: string } };
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { toast } = useToast();

  const isAdmin = profile?.role === "admin";
  const isNewProduct = productId === "new";

  const { data: product, isLoading: loadingProduct } = useQuery<Product | null>({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId || isNewProduct) return null;
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, category, base_price, image_url")
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
    enabled: !!productId && !isNewProduct,
  });

  // Local cover preview that updates immediately upon upload
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  useEffect(() => {
    setCoverPreview(product?.image_url ?? null);
  }, [product?.image_url]);

  // New product form state
  const [newProductData, setNewProductData] = useState({
    name: '',
    description: '',
    category: '',
    base_price: 0,
  });

  // Variants query (moved up to avoid TDZ when used by drafts below)
  const { data: variants, isLoading: loadingVariants } = useQuery<Variant[]>({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      if (!productId || isNewProduct) return [] as Variant[];
      const { data, error } = await (supabase as any)
        .from("product_variants")
        .select("id, product_id, color_name, color_hex, stock, price, image_url, front_image_url, back_image_url, sleeve_image_url, active")
        .eq("product_id", productId)
        .order("color_name", { ascending: true });
      if (error) throw error;
      return (data as unknown as Variant[]) || [];
    },
    enabled: !!productId && !isNewProduct,
  });

  // Local editable drafts of variants
  const [drafts, setDrafts] = useState<Variant[]>([]);

  // Sync drafts whenever variants load/change
  useEffect(() => {
    setDrafts((variants || []).map(v => ({ ...v })));
  }, [variants]);

  // Simple comparator to detect changes between drafts and server variants
  const hasChanges = useMemo(() => {
    if ((variants || []).length !== (drafts || []).length) return true;
    const byId = new Map((variants || []).map(v => [v.id, v] as const));
    for (const d of (drafts || [])) {
      const s = byId.get(d.id);
      if (!s) return true;
      // Compare relevant fields
      const keys: Array<keyof Variant> = [
        'color_name','color_hex','stock','price','image_url','front_image_url','back_image_url','sleeve_image_url','active'
      ];
      for (const k of keys) {
        if ((s as any)[k] !== (d as any)[k]) return true;
      }
    }
    return false;
  }, [variants, drafts]);

  // Upload a specific image field for a variant draft (image_url/front/back/sleeve)
  const uploadImage = useMutation({
    mutationFn: async ({ v, file, field }: { v: Variant; file: File; field: 'image_url'|'front_image_url'|'back_image_url'|'sleeve_image_url' }) => {
      if (!productId) throw new Error('No product id');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeField = String(field);
      const variantId = (typeof v.id === 'string' && !v.id.startsWith('temp-')) ? v.id : 'temp';
      const path = `${productId}/${variantId}/${safeField}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('variant-images')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('variant-images').getPublicUrl(path);
      const publicUrl: string | null = pub?.publicUrl || null;
      const busted: string | null = publicUrl ? `${publicUrl}?v=${Date.now()}` : null;
      return { field, publicUrl: busted } as const;
    },
    onSuccess: ({ field, publicUrl }) => {
      // Update drafts immediately; persistence occurs on Apply/Save
      setDrafts(prev => prev.map(it => ({ ...it, [field]: publicUrl } as Variant)));
      toast({ title: 'Image uploaded', description: 'Preview updated. Remember to Apply/Save to persist.' });
    },
    onError: (err: unknown) => toast({ title: 'Upload failed', description: String((err as Error)?.message || err), variant: 'destructive' as const }),
  });

  // Copy helpers
  const handleCopyStockAll = () => {
    if (!drafts.length) return;
    const seed = drafts[0]?.stock ?? 0;
    setDrafts(prev => prev.map(it => ({ ...it, stock: Math.max(0, Math.floor(seed || 0)) })));
  };

  const handleCopyPriceAll = () => {
    if (!drafts.length) return;
    const seed = drafts[0]?.price ?? null;
    setDrafts(prev => prev.map(it => ({ ...it, price: seed })));
  };

  const handleExportCSV = () => {
    const header = ['id','color_name','color_hex','stock','price','active','image_url','front_image_url','back_image_url','sleeve_image_url'];
    const rows = [header,
      ...(drafts || []).map(d => [
        d.id ?? '',
        d.color_name ?? '',
        d.color_hex ?? '',
        d.stock ?? 0,
        d.price ?? '',
        d.active ?? true,
        d.image_url ?? '',
        d.front_image_url ?? '',
        d.back_image_url ?? '',
        d.sleeve_image_url ?? '',
      ])
    ];
    const csv = rows.map(r => r.map(v => String(v)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variants-${productId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply/Discard
  const applySave = () => {
    // Build payload of updates/inserts from drafts
    const updates: Array<Partial<Variant> & { id?: string }> = (drafts || []).map(d => ({
      id: (typeof d.id === 'string' && d.id.startsWith('temp-')) ? undefined : d.id,
      product_id: d.product_id,
      color_name: d.color_name,
      color_hex: d.color_hex,
      stock: d.stock,
      price: d.price,
      image_url: d.image_url,
      front_image_url: d.front_image_url,
      back_image_url: d.back_image_url,
      sleeve_image_url: d.sleeve_image_url,
      active: d.active,
    }));
    bulkUpdate.mutate(updates, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["product-variants", productId] });
      }
    });
  };

  const discardChanges = () => {
    setDrafts((variants || []).map(v => ({ ...v })));
  };

  // moved below variants query

  // moved below variants query

  // Create new product mutation
  const createProduct = useMutation({
    mutationFn: async (productData: typeof newProductData & { image_url?: string }) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productData.name,
          description: productData.description,
          category: productData.category,
          base_price: productData.base_price,
          image_url: productData.image_url || null,
          available_colors: [],
          available_sizes: [],
          customization_options: {}
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (newProductId: string) => {
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      toast({ title: 'Product created', description: 'Product created successfully.' });
      navigate(`/admin/inventory/${newProductId}`);
    },
    onError: (err: unknown) => toast({ title: 'Creation failed', description: String((err as Error)?.message || err), variant: 'destructive' as const }),
  });

  const uploadProductImage = useMutation({
    mutationFn: async (file: File) => {
      if (!productId && !isNewProduct) throw new Error('No product id');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const tempId = isNewProduct ? 'temp' : productId;
      const path = `products/${tempId}/cover/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
      const publicUrl: string | null = pub?.publicUrl || null;
      const busted: string | null = publicUrl ? `${publicUrl}?v=${Date.now()}` : null;
      
      if (isNewProduct) {
        // For new products, just store the URL locally until product is created
        setCoverPreview(busted);
        return busted;
      } else {
        // For existing products, update the database
        const { error: updErr } = await supabase
          .from('products')
          .update({ image_url: busted })
          .eq('id', productId);
        if (updErr) throw updErr;
        return busted;
      }
    },
    onSuccess: (publicUrl: string | null) => {
      // Optimistically update cache so preview swaps instantly
      if (productId) {
        qc.setQueryData(["product", productId], (old: unknown) => (old && typeof old === 'object') ? { ...(old as any), image_url: publicUrl } : old);
      }
      // Also set immediate local preview in case cache object is null or refetch lags
      setCoverPreview(publicUrl ?? null);
      qc.invalidateQueries({ queryKey: ["product", productId] });
      // Refresh catalog/product lists that show the cover image
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
      qc.invalidateQueries({ queryKey: ["sample-products"] });
      // Also refresh any views that now derive cover from variants
      qc.invalidateQueries({ queryKey: ["catalog-variants"] });
      qc.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey || "").includes("sample-variants") });
      // Admin inventory list uses an object in the key; use predicate to match
      qc.invalidateQueries({
        predicate: (q) => {
          const keyStr = JSON.stringify(q.queryKey || "");
          return keyStr.includes("admin-inventory") || keyStr.includes("products") || keyStr.includes("catalog") || keyStr.includes("variants");
        },
      });
      toast({ title: 'Product image uploaded', description: 'Cover image updated.' });
    },
    onError: (err: unknown) => toast({ title: 'Upload failed', description: String((err as Error)?.message || err), variant: 'destructive' as const }),
  });

  const bulkUpdate = useMutation({
    mutationFn: async (updates: Array<Partial<Variant> & { id?: string }>) => {
      // Split into updates (have id) and inserts (no id)
      const toUpdate = updates.filter(u => !!u.id) as Array<Partial<Variant> & { id: string }>;
      const toInsert = updates.filter(u => !u.id).map(u => ({
        product_id: productId!,
        color_name: u.color_name || "New Color",
        color_hex: u.color_hex || "#000000",
        stock: typeof u.stock === 'number' ? u.stock : 0,
        price: u.price ?? null,
        image_url: u.image_url ?? null,
        front_image_url: u.front_image_url ?? null,
        back_image_url: u.back_image_url ?? null,
        sleeve_image_url: u.sleeve_image_url ?? null,
        active: typeof u.active === 'boolean' ? u.active : true,
      }));

      if (toUpdate.length) {
        await Promise.all(
          toUpdate.map(u => (supabase as any)
            .from('product_variants')
            .update({
              color_name: u.color_name,
              color_hex: u.color_hex,
              stock: u.stock,
              price: u.price,
              image_url: u.image_url,
              front_image_url: u.front_image_url,
              back_image_url: u.back_image_url,
              sleeve_image_url: u.sleeve_image_url,
              active: u.active,
            })
            .eq('id', u.id as string))
        );
      }
      if (toInsert.length) {
        const { error } = await (supabase as any)
          .from('product_variants')
          .insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-variants", productId] });
      toast({ title: "Updated", description: "Bulk changes applied." });
    },
    onError: (err: unknown) => toast({ title: "Failed", description: String((err as Error)?.message || err), variant: "destructive" as const }),
  });

  // (moved below variants query)

  const handleImportCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const get = (arr: string[], key: string) => arr[headers.indexOf(key)] ?? '';
    const existingById = new Map((variants || []).map(v => [v.id, v] as const));
    const existingByName = new Map((variants || []).map(v => [v.color_name.toLowerCase(), v] as const));

    const toUpdates: Array<Partial<Variant> & { id?: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw.trim()) continue;
      const cols = raw.split(',');
      const id = get(cols, 'id');
      const color_name = get(cols, 'color_name');
      const color_hex = get(cols, 'color_hex');
      const stockStr = get(cols, 'stock');
      const priceStr = get(cols, 'price');
      const activeStr = get(cols, 'active');
      const image_url = get(cols, 'image_url');
      const front_image_url = get(cols, 'front_image_url');
      const back_image_url = get(cols, 'back_image_url');
      const sleeve_image_url = get(cols, 'sleeve_image_url');

      const stock = stockStr ? Math.max(0, Math.floor(Number(stockStr))) : undefined;
      const price = priceStr ? Number(priceStr) : undefined;
      const active = activeStr ? activeStr.toLowerCase() === 'true' : undefined;

      if (id && existingById.has(id)) {
        toUpdates.push({ id, color_name: color_name || undefined, color_hex: color_hex || undefined, stock, price: price as any, active, image_url: image_url || undefined, front_image_url: front_image_url || undefined, back_image_url: back_image_url || undefined, sleeve_image_url: sleeve_image_url || undefined });
      } else if (color_name && existingByName.has(color_name.toLowerCase())) {
        const v = existingByName.get(color_name.toLowerCase())!;
        toUpdates.push({ id: v.id, color_name: color_name || undefined, color_hex: color_hex || undefined, stock, price: price as any, active, image_url: image_url || undefined, front_image_url: front_image_url || undefined, back_image_url: back_image_url || undefined, sleeve_image_url: sleeve_image_url || undefined });
      } else {
        toUpdates.push({ color_name, color_hex, stock: stock ?? 0, price: (priceStr ? Number(priceStr) : null) as any, active: active ?? true, image_url, front_image_url, back_image_url, sleeve_image_url });
      }
    }
    bulkUpdate.mutate(toUpdates);
  };


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
    onError: (err: unknown) => {
      toast({ title: "Failed", description: String((err as Error)?.message || err), variant: "destructive" as const });
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
    onError: (err: unknown) => {
      toast({ title: "Failed", description: String((err as Error)?.message || err), variant: "destructive" as const });
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

  if (!product && !isNewProduct) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Product not found.</p>
        <Button onClick={() => navigate(location.state?.from || "/admin/inventory", { replace: true })}>Back</Button>
      </div>
    );
  }

  const displayProduct = product || {
    id: 'new',
    name: newProductData.name || 'New Product',
    description: newProductData.description,
    category: newProductData.category,
    base_price: newProductData.base_price,
    image_url: null
  };

  const handleAddVariant = () => {
    if (!productId && !isNewProduct) return;
    setDrafts(prev => ([
      ...prev,
      {
        id: `temp-${crypto.randomUUID()}`, // temporary local id; DB id will differ
        product_id: productId || 'new',
        color_name: "New Color",
        color_hex: "#000000",
        stock: 0,
        price: null,
        image_url: displayProduct.image_url ?? null,
        front_image_url: null,
        back_image_url: null,
        sleeve_image_url: null,
        active: true,
      } as Variant,
    ]));
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(location.state?.from || "/admin/inventory", { replace: true });
              }
            }}
          > 
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{isNewProduct ? 'Create Product' : 'Edit Product'}</h1>
            <p className="text-sm text-muted-foreground">{displayProduct.name}</p>
          </div>
        </div>

        {isNewProduct && (
          <div className="mb-6 p-6 border rounded-md bg-background">
            <h2 className="text-lg font-medium mb-4">Product Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Product Name</label>
                <Input
                  value={newProductData.name}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter product name"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Input
                  value={newProductData.category}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g. T-Shirts, Hoodies"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Base Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newProductData.base_price}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, base_price: Number(e.target.value) }))}
                  placeholder="0.00"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Input
                  value={newProductData.description}
                  onChange={(e) => setNewProductData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Product description"
                  className="w-full"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button 
                onClick={() => createProduct.mutate({ ...newProductData, image_url: coverPreview || undefined })}
                disabled={!newProductData.name || !newProductData.category || createProduct.isPending}
              >
                {createProduct.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Product
              </Button>
            </div>
          </div>
        )}

        <div className="mb-6 p-4 border rounded-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(coverPreview || displayProduct.image_url) ? (
              <img src={coverPreview || displayProduct.image_url || ''} className="h-12 w-12 rounded object-cover border" alt="product" />
            ) : (
              <div className="h-12 w-12 rounded border bg-muted" />
            )}
            <div>
              <div className="font-medium">Product Cover Image</div>
              <div className="text-xs text-muted-foreground">Shown in catalog and samples if variant image is not set</div>
            </div>
          </div>
          <label className="inline-flex items-center">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) uploadProductImage.mutate(file);
              e.currentTarget.value = '';
            }} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploadProductImage.isPending}
              onClick={(ev) => {
                const input = (ev.currentTarget.previousSibling as HTMLInputElement) ?? null;
                if (input) input.click();
              }}
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Cover
            </Button>
          </label>
        </div>

        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-medium">Variants (Colors)</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleCopyStockAll} disabled={bulkUpdate.isPending || (variants||[]).length === 0}>
              <Copy className="w-4 h-4 mr-1" /> Copy Stock to All
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCopyPriceAll} disabled={bulkUpdate.isPending || (variants||[]).length === 0}>
              <Copy className="w-4 h-4 mr-1" /> Copy Price to All
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={(variants||[]).length === 0}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <label className="inline-flex items-center">
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                if (file) handleImportCSV(file);
                e.currentTarget.value = '';
              }} />
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" /> Import CSV
              </Button>
            </label>
            <Button onClick={handleAddVariant}>
              <Plus className="w-4 h-4 mr-2" /> Add Variant
            </Button>
            <Button variant="secondary" size="sm" onClick={applySave} disabled={!hasChanges || bulkUpdate.isPending}>
              Apply / Save
            </Button>
            <Button variant="ghost" size="sm" onClick={discardChanges} disabled={!hasChanges || bulkUpdate.isPending}>
              Discard
            </Button>
          </div>
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
                <TableHead>Side</TableHead>
                <TableHead>Front</TableHead>
                <TableHead>Back</TableHead>
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
              ) : (drafts || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No variants yet. Click "Add Variant" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                (drafts || []).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Input
                        value={v.color_name}
                        className="h-8"
                        onChange={(e) => setDrafts(prev => prev.map(it => it.id === v.id ? { ...it, color_name: e.currentTarget.value } : it))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={v.color_hex || "#000000"}
                          className="h-8 w-12 p-1"
                          onChange={(e) => setDrafts(prev => prev.map(it => it.id === v.id ? { ...it, color_hex: e.currentTarget.value } : it))}
                        />
                        <Input
                          value={v.color_hex || ''}
                          placeholder="#000000"
                          className="h-8 w-28"
                          onChange={(e) => setDrafts(prev => prev.map(it => {
                            const hex = e.currentTarget.value;
                            return it.id === v.id ? { ...it, color_hex: hex } : it;
                          }))}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: v.color_hex || '#000000' }} />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={String(v.stock ?? 0)}
                        className="h-8 w-24"
                        onChange={(e) => {
                          const val = Number(e.currentTarget.value);
                          const safe = Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
                          setDrafts(prev => prev.map(it => it.id === v.id ? { ...it, stock: safe } : it))
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={v.price == null ? '' : String(v.price)}
                        className="h-8 w-28"
                        placeholder={`Base ${displayProduct.base_price ?? ''}`}
                        onChange={(e) => {
                          const str = e.currentTarget.value;
                          const num = str === '' ? null : Number(str);
                          if (num !== null && !Number.isFinite(num)) return;
                          setDrafts(prev => prev.map(it => it.id === v.id ? { ...it, price: num } : it))
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {v.sleeve_image_url ? (
                          <img src={v.sleeve_image_url} alt="side" className="h-8 w-8 rounded object-cover border" />
                        ) : (
                          <div className="h-8 w-8 rounded border bg-muted" />
                        )}
                        <label className="inline-flex items-center">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.currentTarget.files?.[0];
                              if (file) uploadImage.mutate({ v, file, field: 'sleeve_image_url' });
                              e.currentTarget.value = '';
                            }}
                          />
                          <Button type="button" size="sm" variant="secondary" onClick={(ev) => {
                            const input = (ev.currentTarget.previousSibling as HTMLInputElement) ?? null;
                            if (input) input.click();
                          }} disabled={uploadImage.isPending}>
                            <Upload className="w-4 h-4 mr-1" /> Upload
                          </Button>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {v.front_image_url ? (
                          <img src={v.front_image_url} alt="front" className="h-8 w-8 rounded object-cover border" />
                        ) : (
                          <div className="h-8 w-8 rounded border bg-muted" />
                        )}
                        <label className="inline-flex items-center">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.currentTarget.files?.[0];
                            if (file) uploadImage.mutate({ v, file, field: 'front_image_url' });
                            e.currentTarget.value = '';
                          }} />
                          <Button type="button" size="sm" variant="secondary" disabled={uploadImage.isPending} onClick={(ev) => {
                            const input = (ev.currentTarget.previousSibling as HTMLInputElement) ?? null;
                            if (input) input.click();
                          }}>
                            <Upload className="w-4 h-4 mr-1" /> Upload
                          </Button>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {v.back_image_url ? (
                          <img src={v.back_image_url} alt="back" className="h-8 w-8 rounded object-cover border" />
                        ) : (
                          <div className="h-8 w-8 rounded border bg-muted" />
                        )}
                        <label className="inline-flex items-center">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const file = e.currentTarget.files?.[0];
                            if (file) uploadImage.mutate({ v, file, field: 'back_image_url' });
                            e.currentTarget.value = '';
                          }} />
                          <Button type="button" size="sm" variant="secondary" disabled={uploadImage.isPending} onClick={(ev) => {
                            const input = (ev.currentTarget.previousSibling as HTMLInputElement) ?? null;
                            if (input) input.click();
                          }}>
                            <Upload className="w-4 h-4 mr-1" /> Upload
                          </Button>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={!!v.active}
                        onCheckedChange={(checked) => setDrafts(prev => prev.map(it => it.id === v.id ? { ...it, active: !!checked } : it))}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (typeof v.id === 'string' && v.id.startsWith('temp-')) {
                            setDrafts(prev => prev.filter(it => it.id !== v.id));
                          } else {
                            deleteVariant.mutate(v.id);
                          }
                        }}
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
