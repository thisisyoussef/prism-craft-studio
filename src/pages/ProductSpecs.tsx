import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { getProduct as apiGetProduct, type ApiProduct } from "@/lib/services/productService";
import { listByProduct as listVariantsByProduct, type ApiVariant } from "@/lib/services/variantService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type ProductRow = ApiProduct;

type VariantRow = ApiVariant;

const ImageBlock = ({ src, alt }: { src: string | null | undefined; alt: string }) => (
  <div className="aspect-square rounded-xl overflow-hidden bg-background border">
    {src && src !== "/placeholder.svg" ? (
      <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
    ) : (
      <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">
        No image
      </div>
    )}
  </div>
);

export default function ProductSpecs() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading: loadingProduct } = useQuery<ProductRow | null>({
    enabled: !!productId,
    queryKey: ["product", productId],
    queryFn: async () => {
      const p = await apiGetProduct(productId!);
      if (!p || p.active === false) return null;
      return p;
    },
  });

  const { data: variants, isLoading: loadingVariants } = useQuery<VariantRow[]>({
    enabled: !!productId,
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      const vs = await listVariantsByProduct(productId!);
      return (vs || []) as VariantRow[];
    },
  });

  const activeVariants = useMemo(() => (variants || []).filter(v => v.active !== false), [variants]);

  const cover = useMemo(() => {
    const v = activeVariants.find(v => v.frontImageUrl || v.imageUrl || v.backImageUrl || v.sleeveImageUrl);
    return v?.frontImageUrl || v?.imageUrl || v?.backImageUrl || v?.sleeveImageUrl || product?.imageUrl || null;
  }, [activeVariants, product?.imageUrl]);

  const colorChips = useMemo(() => {
    // Deduplicate by lowercase key but preserve original casing for display
    const map = new Map<string, { name: string; hex: string }>();
    for (const v of activeVariants) {
      const raw = (v.colorName || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const hex = v.colorHex || "#ffffff";
      if (!map.has(key)) {
        map.set(key, { name: raw, hex });
      } else {
        const existing = map.get(key)!;
        // If existing color is missing/placeholder hex, and new hex is provided, update hex
        if ((!existing.hex || existing.hex === "#ffffff") && hex) {
          map.set(key, { ...existing, hex });
        }
      }
    }
    return Array.from(map.values());
  }, [activeVariants]);

  const sizes = product?.sizes || [];
  const opts = (product?.specifications as any) || {};
  const moq = (product?.moq as any) ?? 50;
  const materials: string | undefined = opts?.materials;
  const fit: string | undefined = opts?.fit;
  const care: string | undefined = opts?.care;
  const detailsBullets: string[] = Array.isArray(opts?.details) ? opts.details : [];
  const sizeChart: { columns: string[]; rows: Array<{ label: string; values: string[] }> } | null = opts?.size_chart || null;
  const materialsDisplay = (materials && materials.trim()) || 'Material varies by product';
  const fitDisplay = (fit && fit.trim()) || 'Standard fit';

  const loading = loadingProduct || loadingVariants;

  if (!loading && !product) {
    return (
      <div className="relative min-h-screen bg-background">
        <Navigation />
        <div className="relative z-10">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h1 className="text-2xl font-medium mb-2">Product not available</h1>
            <p className="text-muted-foreground mb-6">This item may be inactive or does not exist.</p>
            <Button variant="hero-secondary" onClick={() => navigate('/catalog')}>Back to catalog</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/catalog">Catalog</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{product?.name || "Product"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              {loading ? (
                <Skeleton className="w-full aspect-square rounded-xl" />
              ) : (
                <ImageBlock src={cover} alt={product?.name || "Product"} />
              )}

              {/* Gallery */}
              {!loading && activeVariants.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {activeVariants.slice(0, 8).map(v => (
                    <ImageBlock
                      key={v.id}
                      src={v.frontImageUrl || v.imageUrl || v.backImageUrl || v.sleeveImageUrl || null}
                      alt={`${product?.name} - ${v.colorName}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="space-y-2">
                <h1 className="text-3xl font-medium tracking-tight text-foreground">
                  {loading ? <Skeleton className="h-8 w-64" /> : product?.name}
                </h1>
                <div className="flex items-center gap-3">
                  {product?.category && (
                    <Badge variant="secondary">{product.category}</Badge>
                  )}
                  <span className="text-2xl font-medium text-foreground">
                    {loading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      `$${Number(product?.basePrice || 0).toFixed(2)}`
                    )}
                    <span className="text-sm text-muted-foreground font-normal">/piece</span>
                  </span>
                </div>
              </div>

              <p className="text-muted-foreground mt-4">
                {loading ? <Skeleton className="h-16 w-full" /> : (product?.description || "")}
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Colors</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {loading ? (
                      <Skeleton className="h-6 w-48" />
                    ) : colorChips.length > 0 ? (
                      colorChips.map((c, idx) => (
                        <span key={idx} title={c.name} className="inline-flex items-center gap-2 text-xs border rounded-full px-2 py-1">
                          <span className="inline-block w-4 h-4 rounded-full border" style={{ backgroundColor: c.hex }} />
                          {c.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Colors depend on stock</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-2">Sizes</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {loading ? (
                      <Skeleton className="h-6 w-40" />
                    ) : sizes.length > 0 ? (
                      sizes.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Sizes available on request</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div>Minimum order: <span className="font-medium">{moq}</span> pieces</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button variant="hero" className="w-full" onClick={() => navigate("/customize")}>Customize</Button>
                  <Button variant="hero-secondary" className="w-full" onClick={() => navigate("/samples")}>See & feel samples</Button>
                </div>
              </div>

              <Separator className="my-6" />

              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="care">Care</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Materials</div>
                        <div className="text-sm text-foreground">{materialsDisplay}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Fit</div>
                        <div className="text-sm text-foreground">{fitDisplay}</div>
                      </div>
                      {detailsBullets.length > 0 ? (
                        <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
                          {detailsBullets.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          We use durable fabrics and clean construction. Tell us what you need and we’ll guide you.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="care" className="mt-4">
                  <Card>
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      {care || 'Wash cold. Tumble low or hang dry. Do not bleach. Iron on low if needed.'}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Size Chart */}
              {sizeChart && Array.isArray(sizeChart.columns) && Array.isArray(sizeChart.rows) && sizeChart.columns.length > 0 && sizeChart.rows.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm font-medium mb-2">Size chart</div>
                  <Card>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left border-b"> </th>
                            {sizeChart.columns.map((col, idx) => (
                              <th key={idx} className="px-3 py-2 text-left border-b">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sizeChart.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b">
                              <td className="px-3 py-2 font-medium whitespace-nowrap">{row.label}</td>
                              {sizeChart.columns.map((_, cIdx) => (
                                <td key={cIdx} className="px-3 py-2 whitespace-nowrap text-muted-foreground">{row.values?.[cIdx] ?? ''}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
