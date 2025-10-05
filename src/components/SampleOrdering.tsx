import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Clock, CheckCircle } from "lucide-react";
import SampleOrderFlow from "./SampleOrderFlow";
import { toast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { listProducts, type ApiProduct } from '@/lib/services/productService';
import { listByProductIds, type ApiVariant } from '@/lib/services/variantService';
import { uploadFile } from '@/lib/services/fileService';

type ProductRow = ApiProduct;

type VariantRow = ApiVariant;

const SampleOrdering = () => {
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [itemsById, setItemsById] = useState<Record<string, { type: 'designed'|'blank'; variantId?: string; colorName?: string; designUrl?: string; unitPrice: number }>>({});
  const [flowType, setFlowType] = useState<'custom' | 'blank'>('custom');

  const { data: productsData, isLoading: productsLoading } = useQuery<ProductRow[]>({
    queryKey: ['sample-products'],
    queryFn: async () => {
      const items = await listProducts();
      // Public endpoint already returns active; filter defensively
      return (items || []).filter(p => p.active !== false);
    },
  });

  // Fetch variants to derive preferred cover per product
  const { data: variantsData } = useQuery<VariantRow[]>({
    enabled: !!productsData && productsData.length > 0,
    queryKey: ['sample-variants', (productsData || []).map(p => p.id).join(',')],
    queryFn: async () => {
      const ids = (productsData || []).map(p => p.id);
      if (ids.length === 0) return [] as VariantRow[];
      return await listByProductIds(ids);
    },
  });

  const coverByProduct = useMemo(() => {
    const map = new Map<string, string | null>();
    const list = (variantsData || []) as ApiVariant[];
    for (const v of list) {
      if (v.active === false) continue;
      const best = v.frontImageUrl || v.imageUrl || v.backImageUrl || v.sleeveImageUrl || null;
      if (!best || best === '/placeholder.svg') continue; // Skip placeholder images
      if (!map.has(v.productId)) map.set(v.productId, best);
    }
    return map;
  }, [variantsData]);

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, ApiVariant[]>();
    const list = (variantsData || []) as ApiVariant[];
    for (const v of list) {
      if (v.active === false) continue;
      const arr = map.get(v.productId) || [];
      arr.push(v);
      map.set(v.productId, arr);
    }
    return map;
  }, [variantsData]);

  const sampleProducts = useMemo(() =>
    (productsData || []).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.basePrice || 0),
      description: p.description || 'Premium materials, quality prints',
      image: coverByProduct.get(p.id) || (p.imageUrl && p.imageUrl !== '/placeholder.svg' ? p.imageUrl : '') || '',
      leadTime: '2-4 days',
    })),
  [productsData, coverByProduct]);

  const toggleSample = (sampleId: string) => {
    setSelectedSamples(prev => {
      const exists = prev.includes(sampleId);
      if (exists) {
        const next = prev.filter(id => id !== sampleId);
        return next;
      } else {
        // Initialize item defaults on selection
        setItemsById((old) => {
          if (old[sampleId]) return old;
          const variants = variantsByProduct.get(sampleId) || [];
          const first = variants[0];
          return {
            ...old,
            [sampleId]: {
              type: flowType === 'custom' ? 'designed' : 'blank',
              variantId: first?.id,
              colorName: first?.colorName,
              designUrl: undefined,
              unitPrice: flowType === 'custom' ? 75 : 50,
            },
          };
        });
        return [...prev, sampleId];
      }
    });
  };

  // Keep item types/prices in sync when flow changes
  useEffect(() => {
    setItemsById(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = {
          ...next[id],
          type: flowType === 'custom' ? 'designed' : 'blank',
          unitPrice: flowType === 'custom' ? 75 : 50,
          designUrl: flowType === 'blank' ? undefined : next[id]?.designUrl,
        };
      });
      return next;
    });
  }, [flowType]);

  const selectedItems = useMemo(() => selectedSamples.map((id) => {
    const sample = sampleProducts.find(p => p.id === id);
    const item = itemsById[id];
    return {
      productId: id,
      productName: sample?.name || '',
      variantId: item?.variantId,
      colorName: item?.colorName,
      type: item?.type || 'designed',
      unitPrice: item?.unitPrice ?? 75,
      designUrl: item?.designUrl,
    };
  }), [selectedSamples, itemsById, sampleProducts]);

  const selectedTotal = selectedItems.reduce((sum, it) => sum + (it.unitPrice || 0), 0);

  return (
    <section id="samples" className="py-16 bg-card-secondary">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-medium tracking-tight text-foreground mb-3">Samples</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Try before you order. 2–4 day delivery. Credit applied to bulk orders.</p>
        </div>

        {/* Flow selector */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          <button
            type="button"
            onClick={() => setFlowType('custom')}
            className={`text-left p-5 rounded-xl border transition-colors ${flowType === 'custom' ? 'border-primary ring-2 ring-primary/20 bg-background' : 'border-primary/10 hover:border-primary/30 bg-background'}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-foreground">Custom sample</h3>
              <span className="text-sm font-medium text-foreground">$75</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Upload your design and choose a color. No full customizer needed.</p>
          </button>
          <button
            type="button"
            onClick={() => setFlowType('blank')}
            className={`text-left p-5 rounded-xl border transition-colors ${flowType === 'blank' ? 'border-primary ring-2 ring-primary/20 bg-background' : 'border-primary/10 hover:border-primary/30 bg-background'}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-foreground">Blank sample</h3>
              <span className="text-sm font-medium text-foreground">$50</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Just the garment. Pick a color. Simple and fast.</p>
          </button>
        </div>

        {/* Sample Benefits */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <Package className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Same quality</h3>
            <p className="text-sm text-muted-foreground">Same materials as your order</p>
          </div>
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <Truck className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Fast delivery</h3>
            <p className="text-sm text-muted-foreground">2–4 day delivery</p>
          </div>
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Time to decide</h3>
            <p className="text-sm text-muted-foreground">30 days to decide. Community pricing honored.</p>
          </div>
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Credit honored</h3>
            <p className="text-sm text-muted-foreground">Sample credit applied at checkout</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sample Selection */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-medium text-foreground mb-6">{flowType === 'custom' ? 'Choose custom samples' : 'Choose blank samples'}</h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {productsLoading && (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`skeleton-${i}`} className="bg-background rounded-xl p-6 border border-primary/5 shadow-soft animate-pulse">
                      <div className="aspect-square rounded-lg bg-muted mb-4" />
                      <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                      <div className="h-3 bg-muted rounded w-5/6" />
                    </div>
                  ))}
                </>
              )}
              {!productsLoading && sampleProducts.map((sample) => (
                <div
                  key={sample.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSample(sample.id);
                    }
                  }}
                  className={`bg-background rounded-xl p-6 border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
                    selectedSamples.includes(sample.id)
                      ? "border-primary ring-2 ring-primary/20 shadow-medium"
                      : "border-primary/5 hover:border-primary/20 shadow-soft"
                  }`}
                  onClick={() => toggleSample(sample.id)}
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-4 bg-background">
                    {sample.image ? (
                      <img 
                        src={sample.image} 
                        alt={sample.name} 
                        loading="lazy" 
                        decoding="async"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">No image</div>
                    )}
                  </div>
                  
                  <h4 className="font-medium text-foreground mb-2">
                    {sample.name}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {sample.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-medium text-foreground">${flowType === 'custom' ? 75 : 50}</div>
                    <Badge variant="outline" className="text-xs">{sample.leadTime}</Badge>
                  </div>
                  
                  {selectedSamples.includes(sample.id) && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Flow</label>
                            <div className="text-sm text-foreground">{flowType === 'custom' ? 'Custom (designed)' : 'Blank'}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Color</label>
                            <select
                              className="w-full border rounded px-2 py-1 text-sm"
                              value={itemsById[sample.id]?.variantId || ''}
                              onChange={(e) => {
                                const vid = e.target.value;
                                const vv = (variantsByProduct.get(sample.id) || []).find(v => v.id === vid);
                                setItemsById(prev => ({
                                  ...prev,
                                  [sample.id]: {
                                    ...(prev[sample.id] || { unitPrice: 75, type: 'designed' }),
                                    variantId: vid,
                                    colorName: vv?.colorName,
                                  },
                                }));
                              }}
                            >
                              {(variantsByProduct.get(sample.id) || []).map(v => (
                                <option key={v.id} value={v.id}>{v.colorName}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {flowType === 'custom' && (
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Design (optional)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*,.png,.jpg,.jpeg,.svg,.pdf,.ai,.eps"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const url = await uploadFile(file, { filePurpose: 'sample_design' });
                                    setItemsById(prev => ({
                                      ...prev,
                                      [sample.id]: {
                                        ...(prev[sample.id] || { unitPrice: 75, type: 'designed' }),
                                        designUrl: url,
                                      },
                                    }));
                                    toast({ title: 'Design uploaded', description: 'Your design has been uploaded.' });
                                  } catch (err) {
                                    toast({ title: 'Upload failed', description: 'Could not upload design. Try again.', variant: 'destructive' });
                                  } finally {
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                              />
                              {itemsById[sample.id]?.designUrl ? (
                                <a href={itemsById[sample.id]!.designUrl} target="_blank" className="text-xs text-primary underline">View</a>
                              ) : null}
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">Unit price: ${flowType === 'custom' ? 75 : 50}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary (Inline Flow) */}
          <div className="lg:col-span-1">
            <div className="bg-background rounded-xl p-6 shadow-medium border border-primary/5 sticky top-8">
              <h3 className="text-xl font-medium text-foreground mb-6">Sample Order</h3>
              {selectedSamples.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Choose samples to get started</p>
              ) : (
                <SampleOrderFlow mode="inline" items={selectedItems} hideSelection />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SampleOrdering;