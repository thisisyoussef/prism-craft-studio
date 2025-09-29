import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Product = {
  id: string;
  name: string;
  category: string;
  description?: string;
  basePrice: number;
  minimumQuantity: number;
  active: boolean; // API uses 'active' not 'isActive'
  images?: string[];
  specifications?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

export default function Products() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const qc = useQueryClient();

  const { data: products, isLoading, isError, error } = useQuery<Product[]>({
    queryKey: ['products', 'admin'],
    queryFn: async () => {
      try {
        const res = await api.get<{ products: Product[] }>('/products');
        console.log('Products API response:', res.data);
        // API returns { products: [...] }, extract the array
        return (Array.isArray(res.data?.products) ? res.data.products : []) as Product[];
      } catch (err) {
        console.error('Products API error:', err);
        throw err;
      }
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await api.patch<Product>(`/products/${id}`, { active });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const q = searchQuery.toLowerCase().trim();
    const bySearch = q
      ? list.filter((p: Product) =>
          p.name.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        )
      : list;
    const byCategory = selectedCategory === 'All'
      ? bySearch
      : bySearch.filter((p: Product) => (p.category || '') === selectedCategory);
    return byCategory;
  }, [products, searchQuery, selectedCategory]);

  const categories = useMemo((): string[] => {
    const list: Product[] = Array.isArray(products) ? products : [];
    const dedup = new Set<string>();
    for (const p of list) {
      const c = (p.category || '').trim();
      if (c) dedup.add(c);
    }
    return Array.from(dedup).sort();
  }, [products]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products & Inventory</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-brand-600 text-white rounded px-4 py-2 text-sm hover:bg-brand-700"
        >
          Add Product
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border rounded px-3 py-2 w-full max-w-md"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded px-3 py-2"
          title="Filter by category"
        >
          <option value="All">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {isLoading && <div>Loading products...</div>}
      {isError && <div className="text-red-700">{(error as any)?.message || 'Failed to load products'}</div>}

      {!isLoading && !isError && (
        <div className="bg-white border rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Base Price</th>
                <th className="px-4 py-3">MOQ</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product: Product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {(product.images && product.images[0]) ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No img</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-gray-500 text-xs truncate max-w-xs">{product.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3">${product.basePrice.toFixed(2)}</td>
                  <td className="px-4 py-3">{product.minimumQuantity}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive.mutate({ id: product.id, active: !product.active })}
                      className={`px-2 py-1 rounded text-xs ${
                        product.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/products/${product.id}`}
                        className="text-brand-700 hover:underline text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm('Delete this product? This cannot be undone.')) {
                            deleteProduct.mutate(product.id);
                          }
                        }}
                        className="text-red-700 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="text-gray-500 text-sm p-6 text-center">
              {searchQuery ? 'No products match your search' : 'No products found'}
            </div>
          )}
        </div>
      )}

      {showCreateForm && (
        <CreateProductModal 
          categories={categories}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            qc.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}
    </div>
  );
}

function CreateProductModal({ categories, onClose, onSuccess }: { categories: string[]; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    basePrice: '',
    minimumQuantity: '1',
    active: true,
  });

  const [catMode, setCatMode] = useState<'select' | 'custom'>(Array.isArray(categories) && categories.length ? 'select' : 'custom');
  const [catValue, setCatValue] = useState<string>(Array.isArray(categories) && categories.length ? categories[0]! : '');
  const [catCustom, setCatCustom] = useState<string>('');

  const createProduct = useMutation({
    mutationFn: async (data: any) => {
      const chosenCategory = (catMode === 'custom' ? catCustom : catValue).trim();
      const payload = {
        ...data,
        category: chosenCategory,
        basePrice: parseFloat(data.basePrice),
        minimumQuantity: parseInt(data.minimumQuantity),
      };
      const res = await api.post<Product>('/products', payload);
      return res.data;
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenCategory = (catMode === 'custom' ? catCustom : catValue).trim();
    if (!chosenCategory) {
      alert('Please select or enter a category');
      return;
    }
    createProduct.mutate({ ...formData, category: chosenCategory });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Create New Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex items-center gap-2">
              <select
                className="border rounded px-3 py-2"
                value={catMode === 'custom' ? 'custom' : (catValue || '')}
                onChange={(e) => {
                  if (e.target.value === 'custom') { setCatMode('custom'); }
                  else { setCatMode('select'); setCatValue(e.target.value); }
                }}
                title="Select category"
              >
                {Array.isArray(categories) && categories.length ? <option value="">Select…</option> : null}
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
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium mb-1">Min Quantity</label>
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
              disabled={createProduct.isPending}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
            >
              {createProduct.isPending ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
