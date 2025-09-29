import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_ORIGIN } from '../lib/api';
import { ImageManager } from '../components/ImageManager';

type Product = {
  id: string;
  name: string;
  category: string;
  description?: string;
  basePrice: number;
  minimumQuantity: number;
  active: boolean; // API uses 'active' not 'isActive'
  images?: string[];
  imageUrl?: string;
  specifications?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

type Variant = {
  id: string;
  productId: string;
  colorName: string; // API uses 'colorName' not 'color'
  colorHex?: string; // API uses 'colorHex' not 'hexCode'
  stock: number;
  price?: number; // API uses 'price' not 'priceOverride'
  imageUrl?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  sleeveImageUrl?: string;
  active: boolean;
  createdAt?: string;
};

type Tab = 'details' | 'images' | 'variants';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('details');
  const [showVariantForm, setShowVariantForm] = useState(false);
  const qc = useQueryClient();

  const productQ = useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const res = await api.get<Product>(`/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Drafts for variants to enable Save & Apply pattern
  const [variantDrafts, setVariantDrafts] = useState<Variant[]>([]);

  const [applyingVariants, setApplyingVariants] = useState(false);
  const applyVariantDrafts = async () => {
    if (!Array.isArray(variantDrafts) || !Array.isArray(variantsQ.data)) return;
    setApplyingVariants(true);
    try {
      const originalById = new Map<string, Variant>((variantsQ.data as Variant[]).map(v => [v.id, v]));
      const keys: Array<keyof Variant> = ['colorName','colorHex','stock','price','active'];
      for (const d of variantDrafts) {
        const o = originalById.get(d.id);
        if (!o) continue;
        const patch: any = {};
        for (const k of keys) {
          if ((o as any)[k] !== (d as any)[k]) patch[k] = (d as any)[k];
        }
        if (Object.keys(patch).length) {
          await updateVariant.mutateAsync({ variantId: d.id, data: patch });
        }
      }
      await qc.invalidateQueries({ queryKey: ['products', id, 'variants'] });
    } finally {
      setApplyingVariants(false);
    }
  };

  // Derive distinct categories from all products for dropdown
  const categoriesQ = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: async () => {
      const res = await api.get<{ products: Product[] }>(`/products`);
      const list: Product[] = Array.isArray(res.data?.products) ? res.data.products : [];
      const set = new Set<string>();
      for (const p of list) {
        const c = (p.category || '').trim();
        if (c) set.add(c);
      }
      return Array.from(set).sort();
    },
  });

  const variantsQ = useQuery({
    queryKey: ['products', id, 'variants'],
    queryFn: async () => {
      try {
        const res = await api.get(`/products/${id}/variants`);
        console.log('Variants API response:', res.data);
        // API returns { variants: [...] }
        return res.data.variants || [];
      } catch (err) {
        console.error('Variants API error:', err);
        return [];
      }
    },
    enabled: !!id,
  });

  // Initialize drafts when variants load/change
  useEffect(() => {
    setVariantDrafts(Array.isArray(variantsQ.data) ? (variantsQ.data as Variant[]).map(v => ({ ...v })) : []);
  }, [variantsQ.data]);

  const updateProduct = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const res = await api.patch<Product>(`/products/${id}`, data);
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['products', id], data);
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteVariant = useMutation({
    mutationFn: async (variantId: string) => {
      await api.delete(`/variants/${variantId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', id, 'variants'] });
    },
  });

  const updateVariant = useMutation({
    mutationFn: async ({ variantId, data }: { variantId: string; data: Partial<Variant> }) => {
      const res = await api.patch<Variant>(`/variants/${variantId}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', id, 'variants'] });
    },
  });

  // Upload a file for a specific variant image slot and persist URL
  const uploadVariantSlot = async (
    variantId: string,
    slot: 'imageUrl' | 'frontImageUrl' | 'backImageUrl' | 'sleeveImageUrl',
    file: File
  ) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('filePurpose', 'mockup');
    const res = await api.post<{ fileUrl: string }>(`/files/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const fileUrl = res.data.fileUrl;
    const absolute = /^https?:\/\//i.test(fileUrl) ? fileUrl : `${API_ORIGIN}${fileUrl}`;
    await updateVariant.mutateAsync({ variantId, data: { [slot]: absolute } as any });
  };

  const product = productQ.data;
  const variants = variantsQ.data ?? [];

  if (productQ.isLoading) return <div>Loading product...</div>;
  if (productQ.isError) return <div className="text-red-700">Failed to load product</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <div className="text-gray-500 text-sm">{product.category}</div>
        </div>
        <Link to="/products" className="text-sm text-brand-700 hover:underline">Back to products</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['details', 'images', 'variants'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 capitalize ${
              tab === t ? 'border-brand-600 text-gray-900' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Product Details */}
      {tab === 'details' && (
        <div className="bg-white border rounded p-6">
          <ProductForm 
            product={product} 
            categories={categoriesQ.data || []}
            onUpdate={(data) => updateProduct.mutate(data)}
            isUpdating={updateProduct.isPending}
          />
        </div>
      )}

      {/* Product Images */}
      {tab === 'images' && (
        <div className="bg-white border rounded p-6">
          <ImageManager
            images={product.images || []}
            entityType="product"
            entityId={product.id}
            onImagesUpdate={(images) => {
              qc.setQueryData(['products', id], { ...product, images });
            }}
            maxImages={10}
          />
        </div>
      )}

      {/* Variants */}
      {tab === 'variants' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Color Variants</h2>
            <button
              onClick={() => setShowVariantForm(true)}
              className="bg-brand-600 text-white rounded px-3 py-2 text-sm hover:bg-brand-700"
            >
              Add Variant
            </button>
          </div>

          {/* Save & Apply controls for variant drafts */}
          <div className="flex items-center gap-2">
            <button
              onClick={applyVariantDrafts}
              disabled={applyingVariants}
              className="px-3 py-2 text-sm bg-gray-900 text-white rounded disabled:opacity-50"
            >
              {applyingVariants ? 'Applying…' : 'Apply Changes'}
            </button>
            <button
              onClick={() => setVariantDrafts(Array.isArray(variantsQ.data) ? (variantsQ.data as Variant[]).map(v => ({ ...v })) : [])}
              className="px-3 py-2 text-sm border rounded"
            >
              Discard Changes
            </button>
          </div>

          <div className="space-y-4">
            {variantDrafts.length === 0 ? (
              <div className="bg-white border rounded p-6 text-center text-gray-500">
                No variants found. Add a color variant to get started.
              </div>
            ) : (
              variantDrafts.map((variant: Variant) => (
                <div key={variant.id} className="bg-white border rounded p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Variant Details */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        {variant.colorHex && (
                          <div 
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: variant.colorHex }}
                          />
                        )}
                        <input
                          className="border rounded px-2 py-1 text-sm font-medium"
                          value={variant.colorName}
                          onChange={(e) => setVariantDrafts(prev => prev.map(v => v.id === variant.id ? { ...v, colorName: e.target.value } : v))}
                        />
                        <input
                          className="border rounded px-2 py-1 text-sm w-28"
                          value={variant.colorHex || ''}
                          placeholder="#000000"
                          onChange={(e) => setVariantDrafts(prev => prev.map(v => v.id === variant.id ? { ...v, colorHex: e.target.value } : v))}
                        />
                        <button
                          onClick={() => setVariantDrafts(prev => prev.map(v => v.id === variant.id ? { ...v, active: !v.active } : v))}
                          className={`px-2 py-1 rounded text-xs ${
                            variant.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {variant.active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Stock</label>
                          <input
                            type="number"
                            value={variant.stock}
                            onChange={(e) => setVariantDrafts(prev => prev.map(v => v.id === variant.id ? { ...v, stock: parseInt(e.target.value) || 0 } : v))}
                            className="w-full border rounded px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Price Override</label>
                          <input
                            type="number"
                            step="0.01"
                            value={typeof variant.price === 'number' ? variant.price : '' as any}
                            onChange={(e) => setVariantDrafts(prev => prev.map(v => v.id === variant.id ? { ...v, price: e.target.value ? parseFloat(e.target.value) : undefined } : v))}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Uses base price"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (confirm('Delete this variant? This cannot be undone.')) {
                              deleteVariant.mutate(variant.id);
                            }
                          }}
                          className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
                        >
                          Delete Variant
                        </button>
                      </div>
                    </div>

                    {/* Variant Images */}
                    <div>
                      <div className="space-y-4">
                        <h4 className="font-medium">Variant Images</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {(
                            [
                              { label: 'Main Image', url: variant.imageUrl, key: 'imageUrl' as const },
                              { label: 'Front View', url: variant.frontImageUrl, key: 'frontImageUrl' as const },
                              { label: 'Back View', url: variant.backImageUrl, key: 'backImageUrl' as const },
                              { label: 'Sleeve View', url: variant.sleeveImageUrl, key: 'sleeveImageUrl' as const },
                            ]
                          ).map(({ label, url, key }) => (
                            <div key={key} className="space-y-2">
                              <label className="block text-sm font-medium">{label}</label>
                              {url ? (
                                <div className="relative">
                                  <img 
                                    src={url as string} 
                                    alt={label}
                                    className="w-full h-24 object-cover rounded border"
                                  />
                                  <div className="absolute top-1 right-1 flex gap-1">
                                    <label className="bg-white/90 border rounded px-2 py-0.5 text-xs cursor-pointer hover:bg-white">
                                      Replace
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) await uploadVariantSlot(variant.id, key, file);
                                          e.currentTarget.value = '';
                                        }}
                                      />
                                    </label>
                                    <button
                                      onClick={() => updateVariant.mutate({ variantId: variant.id, data: { [key]: null } as any })}
                                      className="bg-red-600 text-white rounded px-2 py-0.5 text-xs"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="w-full h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer text-xs text-gray-500 hover:bg-gray-50">
                                  Upload
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) await uploadVariantSlot(variant.id, key, file);
                                      e.currentTarget.value = '';
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {showVariantForm && (
            <CreateVariantModal
              productId={id!}
              onClose={() => setShowVariantForm(false)}
              onSuccess={() => {
                setShowVariantForm(false);
                qc.invalidateQueries({ queryKey: ['products', id, 'variants'] });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ProductForm({ 
  product, 
  categories,
  onUpdate, 
  isUpdating 
}: { 
  product: Product;
  categories: string[];
  onUpdate: (data: Partial<Product>) => void;
  isUpdating: boolean;
}) {
  const [formData, setFormData] = useState({
    name: product.name,
    category: product.category,
    description: product.description || '',
    basePrice: product.basePrice.toString(),
    minimumQuantity: product.minimumQuantity.toString(),
    active: product.active,
  });

  // Category select with Custom… option
  const initialHasMatch = (categories || []).some(c => c.toLowerCase() === (product.category || '').toLowerCase());
  const [catMode, setCatMode] = useState<'select'|'custom'>(initialHasMatch ? 'select' : 'custom');
  const [catValue, setCatValue] = useState<string>(initialHasMatch ? (product.category || '') : '');
  const [catCustom, setCatCustom] = useState<string>(initialHasMatch ? '' : (product.category || ''));

  React.useEffect(() => {
    const hasMatch = (categories || []).some(c => c.toLowerCase() === (product.category || '').toLowerCase());
    setCatMode(hasMatch ? 'select' : 'custom');
    setCatValue(hasMatch ? (product.category || '') : '');
    setCatCustom(!hasMatch ? (product.category || '') : '');
  }, [product.category, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenCategory = (catMode === 'custom' ? catCustom : catValue).trim();
    onUpdate({
      name: formData.name,
      category: chosenCategory,
      description: formData.description,
      basePrice: parseFloat(formData.basePrice),
      minimumQuantity: parseInt(formData.minimumQuantity),
      active: formData.active,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <div className="flex gap-2 items-center">
            <select
              className="border rounded px-3 py-2"
              value={catMode === 'custom' ? 'custom' : (catValue || '')}
              onChange={(e) => {
                if (e.target.value === 'custom') { setCatMode('custom'); }
                else { setCatMode('select'); setCatValue(e.target.value); }
              }}
              title="Select category"
            >
              <option value="">Select…</option>
              {(categories || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="custom">Custom…</option>
            </select>
            {catMode === 'custom' && (
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Enter category"
                value={catCustom}
                onChange={(e) => setCatCustom(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full border rounded px-3 py-2"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Base Price</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.basePrice}
            onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Minimum Quantity</label>
          <input
            type="number"
            required
            value={formData.minimumQuantity}
            onChange={(e) => setFormData({ ...formData, minimumQuantity: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
        />
        <label htmlFor="active" className="text-sm">Active</label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            const chosenCategory = (catMode === 'custom' ? catCustom : catValue).trim();
            onUpdate({
              name: formData.name,
              category: chosenCategory,
              description: formData.description,
              basePrice: parseFloat(formData.basePrice),
              minimumQuantity: parseInt(formData.minimumQuantity),
              active: formData.active,
            });
          }}
          className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          disabled={isUpdating}
        >
          Apply
        </button>
        <button
          type="submit"
          disabled={isUpdating}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
        >
          {isUpdating ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function CreateVariantModal({ 
  productId, 
  onClose, 
  onSuccess 
}: { 
  productId: string; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    colorName: '',
    colorHex: '',
    stock: '0',
    price: '',
    active: true,
  });

  const createVariant = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        stock: parseInt(data.stock) || 0,
        price: data.price ? parseFloat(data.price) : undefined,
      };
      const res = await api.post<Variant>(`/products/${productId}/variants`, payload);
      return res.data;
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVariant.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Add Color Variant</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Color Name</label>
            <input
              type="text"
              required
              value={formData.colorName}
              onChange={(e) => setFormData({ ...formData, colorName: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Navy Blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hex Code (optional)</label>
            <input
              type="text"
              value={formData.colorHex}
              onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., #1e3a8a"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Initial Stock</label>
              <input
                type="number"
                required
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price Override</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="variantActive"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            />
            <label htmlFor="variantActive" className="text-sm">Active</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createVariant.isPending}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
            >
              {createVariant.isPending ? 'Creating...' : 'Add Variant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
