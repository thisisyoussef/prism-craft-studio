import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  base_price: number | null;
  image_url: string | null;
  available_colors: string[] | null;
};

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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const navigate = useNavigate();

  const { data: productsData } = useQuery<ProductRow[]>({
    queryKey: ["catalog-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, category, base_price, image_url, available_colors, customization_options")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Filter only active products
      const activeProducts = (data || []).filter(p => {
        const opts = p.customization_options as any;
        return opts?.active === true || opts?.active === 'true';
      });
      return activeProducts as ProductRow[];
    },
  });

  // Fetch all variants for listed products to compute color counts and swatches
  const { data: variantsData } = useQuery<VariantRow[]>({
    enabled: !!productsData && productsData.length > 0,
    // keep key small to avoid deep type instantiation
    queryKey: ["catalog-variants", (productsData || []).map(p => p.id).join(",")],
    queryFn: async () => {
      const ids = (productsData || []).map(p => p.id);
      if (ids.length === 0) return [] as VariantRow[];
      const { data, error } = await (supabase as any)
        .from("product_variants")
        .select("id, product_id, color_name, color_hex, active, image_url, front_image_url, back_image_url, sleeve_image_url")
        .in("product_id", ids);
      if (error) throw error;
      return ((data as unknown) as VariantRow[]) || [];
    },
  });

  // Map product_id -> distinct active colors with hex
  const colorsByProduct = useMemo(() => {
    const map = new Map<string, { name: string; hex: string }[]>();
    const list = variantsData || [];
    for (const v of list) {
      if (v.active === false) continue;
      const name = (v.color_name || "").trim();
      if (!name) continue;
      const hex = v.color_hex || "#ffffff";
      const arr = map.get(v.product_id) || [];
      // ensure uniqueness by name (case-insensitive)
      if (!arr.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        arr.push({ name, hex });
        map.set(v.product_id, arr);
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
    return selectedCategory === "All" ? list : list.filter(p => (p.category || "") === selectedCategory);
  }, [productsData, selectedCategory]);

  // Compute a fallback cover per product from its variants
  const coverByProduct = useMemo(() => {
    const map = new Map<string, string | null>();
    const list = variantsData || [];
    for (const v of list) {
      if (v.active === false) continue;
      const best = v.front_image_url || v.image_url || v.back_image_url || v.sleeve_image_url || null;
      if (!best || best === '/placeholder.svg') continue; // Skip placeholder images
      if (!map.has(v.product_id)) map.set(v.product_id, best);
    }
    return map;
  }, [variantsData]);

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
              onClick={() => setSelectedCategory(category)}
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
                  const productCover = product.image_url !== '/placeholder.svg' ? product.image_url : null;
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
                    ${Number(product.base_price || 0).toFixed(2)}
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
                    Customize this
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => navigate('/catalog')}
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
                Start designing
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductCatalog;