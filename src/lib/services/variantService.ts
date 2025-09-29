import api from '@/lib/api';

export type ApiVariant = {
  id: string;
  productId: string;
  colorName: string;
  colorHex: string;
  stock: number;
  price?: number | null;
  imageUrl?: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  sleeveImageUrl?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listByProductIds(productIds: string[]): Promise<ApiVariant[]> {
  if (!productIds.length) return [];
  const { data } = await api.get('/variants', { params: { productIds: productIds.join(',') } });
  return (data?.variants || []) as ApiVariant[];
}

export async function listByProduct(productId: string): Promise<ApiVariant[]> {
  const { data } = await api.get(`/products/${productId}/variants`);
  return (data?.variants || []) as ApiVariant[];
}

export async function createVariant(productId: string, payload: Partial<ApiVariant>): Promise<ApiVariant> {
  const { data } = await api.post(`/products/${productId}/variants`, payload);
  return data as ApiVariant;
}

export async function updateVariant(id: string, patch: Partial<ApiVariant>): Promise<ApiVariant> {
  const { data } = await api.patch(`/variants/${id}`, patch);
  return data as ApiVariant;
}

export async function deleteVariant(id: string): Promise<void> {
  await api.delete(`/variants/${id}`);
}
