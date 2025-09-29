import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listProducts, type ApiProduct } from "@/lib/services/productService";
import { listByProductIds, type ApiVariant } from "@/lib/services/variantService";

type ProductRow = ApiProduct;

type VariantRow = {
  id: string;
  product_id: string;
  color_name: string;
  color_hex: string | null;
  active: boolean | null;
  image_url?: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  sleeve_image_url?: string | null;
};

const ProductCatalog = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get('category') || 'All';
  const urlSearch = searchParams.get('search') || '';
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);

  const { data: productsData, isLoading, error } = useQuery<ProductRow[]>({
    queryKey: ["catalog-products"],
    queryFn: async () => {
      console.log('ProductCatalog: Fetching products...');
      const items = await listProducts();
      console.log('ProductCatalog: Received products:', items);
      // Public endpoint only returns active; still filter defensively
      return (items || []).filter(p => p.active !== false);
    },
  });

  console.log('ProductCatalog: Rendering with data:', productsData, 'loading:', isLoading, 'error:', error);

  // Keep local selectedCategory in sync with URL changes
  useEffect(() => {
    if (selectedCategory !== urlCategory) {
      setSelectedCategory(urlCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategory]);

  // Fetch all variants for listed products to compute color counts and swatches
  const { data: variantsData } = useQuery<ApiVariant[]>({
    enabled: !!productsData && productsData.length > 0,
    // keep key small to avoid deep type instantiation
    queryKey: ["catalog-variants", (productsData || []).map(p => p.id).join(",")],
    queryFn: async () => {
      const ids = (productsData || []).map(p => p.id);
      if (ids.length === 0) return [] as ApiVariant[];
      return await listByProductIds(ids);
    },
  });

  // Map product_id -> distinct active colors with hex
  const colorsByProduct = useMemo(() => {
    const map = new Map<string, { name: string; hex: string }[]>();
    const list = (variantsData || []) as ApiVariant[];
    for (const v of list) {
      if (v.active === false) continue;
      const name = (v.colorName || "").trim();
      if (!name) continue;
      const hex = v.colorHex || "#ffffff";
      const arr = map.get(v.productId) || [];
      // ensure uniqueness by name (case-insensitive)
      if (!arr.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        arr.push({ name, hex });
        map.set(v.productId, arr);
      }
    }
    return map;
  }, [variantsData]);

  const categories = useMemo(() => {
    const base = new Set<string>(["All"]);
    for (const p of productsData || []) if (p.category) base.add(p.category);
    return Array.from(base);
  }, [productsData]);

  const filteredProducts = useMemo(() => {
    const list = productsData || [];
    const byCategory = selectedCategory === "All" ? list : list.filter(p => (p.category || "") === selectedCategory);
    const q = urlSearch.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [productsData, selectedCategory, urlSearch]);

  // Compute a fallback cover per product from its variants
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

  if (isLoading) {
    return (
      <section id="products" className="py-16 bg-background">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="text-lg text-muted-foreground">Loading products...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="products" className="py-16 bg-background">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="text-lg text-red-600">Error loading products: {String(error)}</div>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="py-16 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-medium tracking-tight text-foreground mb-4">
            Choose your garment
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Premium blanks ready for your design. From 50 pieces.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => {
                setSelectedCategory(category);
                const next = new URLSearchParams(searchParams);
                if (category === 'All') {
                  next.delete('category');
                } else {
                  next.set('category', category);
                }
                // Preserve search term if present
                if (urlSearch) {
                  next.set('search', urlSearch);
                } else {
                  next.delete('search');
                }
                setSearchParams(next, { replace: true });
              }}
              className="rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-2xl overflow-hidden shadow-soft border border-primary/5 hover:shadow-medium transition-all duration-200 group"
            >
              <div className="aspect-square relative overflow-hidden bg-background">
                {(() => {
                  // Prefer a variant-derived front image first; fallback to product.image_url
                  const variantCover = coverByProduct.get(product.id);
                  const productCover = product.imageUrl && product.imageUrl !== '/placeholder.svg' ? product.imageUrl : null;
                  const cover = variantCover || productCover || null;
                  return cover ? (
                    <img src={cover} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">No image</div>
                  );
                })()}
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {product.description || ''}
                </p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-medium text-foreground">
                    ${Number(product.basePrice || 0).toFixed(2)}
                    <span className="text-sm text-muted-foreground font-normal">/piece</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {(colorsByProduct.get(product.id) || []).slice(0, 5).map((c, idx) => (
                        <span
                          key={idx}
                          title={c.name}
                          className="inline-block w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {(colorsByProduct.get(product.id) || []).length} colors
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    variant="hero" 
                    className="w-full"
                    onClick={() => navigate('/customize')}
                  >
                    Customize
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    View specs
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-card-secondary rounded-2xl p-8 border border-primary/5">
            <h3 className="text-2xl font-medium text-foreground mb-4">
              Need help with your order?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              We'll guide you through each step.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => navigate('/designers')}
              >
                Get design help
              </Button>
              <Button 
                variant="hero-secondary" 
                size="lg"
                onClick={() => navigate('/customize')}
              >
                Customize
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductCatalog;