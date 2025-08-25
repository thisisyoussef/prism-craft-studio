import type { GarmentType } from '@/components/GarmentMockups'

export type ProductId = 
  | 't-shirt'
  | 'long-sleeve'
  | 'cotton-crewneck'
  | 'fleece-crewneck'
  | 'hoodie'
  | 'modest-hoodie'

export interface CatalogProduct {
  id: ProductId
  name: string
  basePrice: number
  mockupType: GarmentType
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
  { id: 't-shirt', name: 'Classic T-Shirt', basePrice: 13.0, mockupType: 't-shirt' },
  { id: 'long-sleeve', name: 'Long Sleeve Shirt', basePrice: 15.5, mockupType: 't-shirt' },
  { id: 'cotton-crewneck', name: 'Cotton Crewneck', basePrice: 17.5, mockupType: 'sweatshirt' },
  { id: 'fleece-crewneck', name: 'Fleece Crewneck', basePrice: 19.0, mockupType: 'sweatshirt' },
  { id: 'hoodie', name: 'Hoodie', basePrice: 24.0, mockupType: 'hoodie' },
  { id: 'modest-hoodie', name: 'Modest Hoodie', basePrice: 22.5, mockupType: 'hoodie' },
]

export const PRODUCT_MAP = Object.fromEntries(PRODUCT_CATALOG.map(p => [p.id, p])) as Record<ProductId, CatalogProduct>
