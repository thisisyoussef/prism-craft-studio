import api from '@/lib/api';

export type ApiProduct = {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  description?: string | null;
  imageUrl?: string | null;
  images?: string[];
  materials?: string[];
  colors?: string[];
  sizes?: string[];
  minimumQuantity?: number;
  moq?: number;
  specifications?: Record<string, any> | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateProductInput = {
  name: string;
  category: string;
  basePrice: number;
  description?: string;
  imageUrl?: string;
  colors?: string[];
  sizes?: string[];
  moq?: number;
  specifications?: Record<string, any>;
  active?: boolean;
};

export async function listProducts(): Promise<ApiProduct[]> {
  const { data } = await api.get('/products');
  return (data?.products || []) as ApiProduct[];
}

export async function getProduct(id: string): Promise<ApiProduct> {
  const { data } = await api.get(`/products/${id}`);
  return data as ApiProduct;
}

export async function createProduct(payload: CreateProductInput): Promise<ApiProduct> {
  const { data } = await api.post('/products', payload);
  return data as ApiProduct;
}

export async function updateProduct(id: string, patch: Partial<CreateProductInput>): Promise<ApiProduct> {
  const { data } = await api.patch(`/products/${id}`, patch);
  return data as ApiProduct;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

export async function uploadFile(file: File, extra?: { filePurpose?: string; productId?: string }) {
  const form = new FormData();
  form.append('file', file);
  if (extra?.filePurpose) form.append('filePurpose', extra.filePurpose);
  if (extra?.productId) form.append('productId', extra.productId);
  const { data } = await api.post('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const rel = (data?.fileUrl || '') as string;
  const base = String(api.defaults.baseURL || '');
  const origin = base.replace(/\/?api\/?$/, '');
  const absolute = rel?.startsWith('http') ? rel : `${origin}${rel}`;
  return { fileUrl: absolute } as { fileUrl: string };
}
