import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Clock, CheckCircle, Star } from "lucide-react";
import SampleOrderFlow from "./SampleOrderFlow";
import { toast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  base_price: number | null;
  image_url: string | null;
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

const SampleOrdering = () => {
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);

  const { data: productsData } = useQuery<ProductRow[]>({
    queryKey: ['sample-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, base_price, image_url, customization_options')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Filter only active products
      const activeProducts = (data || []).filter(p => {
        const opts = p.customization_options as any;
        return opts?.active === true || opts?.active === 'true';
      });
      return activeProducts;
    },
  });

  // Fetch variants to derive preferred cover per product
  const { data: variantsData } = useQuery<VariantRow[]>({
    enabled: !!productsData && productsData.length > 0,
    queryKey: ['sample-variants', (productsData || []).map(p => p.id).join(',')],
    queryFn: async () => {
      const ids = (productsData || []).map(p => p.id);
      if (ids.length === 0) return [] as VariantRow[];
      const { data, error } = await (supabase as any)
        .from('product_variants')
        .select('id, product_id, color_name, color_hex, active, image_url, front_image_url, back_image_url, sleeve_image_url')
        .in('product_id', ids);
      if (error) throw error;
      return (data as unknown as VariantRow[]) || [];
    },
  });

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

  const sampleProducts = useMemo(() =>
    (productsData || []).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.base_price || 0),
      description: p.description || 'Premium materials, quality prints',
      image: coverByProduct.get(p.id) || (p.image_url !== '/placeholder.svg' ? p.image_url : '') || '',
      leadTime: '2-4 days',
    })),
  [productsData, coverByProduct]);

  const testimonials = [
    {
      name: "Sarah Johnson",
      company: "TechStart Inc.",
      quote: "The sample quality was exactly what we expected. Made our bulk order decision easy.",
      rating: 5
    },
    {
      name: "Mike Chen", 
      company: "Local Sports Club",
      quote: "Fast delivery and great fabric quality. The colors matched perfectly.",
      rating: 5
    },
    {
      name: "Lisa Rodriguez",
      company: "Creative Agency",
      quote: "Professional packaging and detailed fabric info helped our client presentation.",
      rating: 5
    }
  ];

  const toggleSample = (sampleId: string) => {
    setSelectedSamples(prev => 
      prev.includes(sampleId) 
        ? prev.filter(id => id !== sampleId)
        : [...prev, sampleId]
    );
  };

  const selectedTotal = selectedSamples.reduce((total, sampleId) => {
    const sample = sampleProducts.find(p => p.id === sampleId);
    return total + (sample?.price || 0);
  }, 0);

  return (
    <section id="samples" className="py-16 bg-card-secondary">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-medium tracking-tight text-foreground mb-4">
            Quality samples
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trust through experience. 2-4 day delivery. Sample Credit applied toward orders.
          </p>
        </div>

        {/* Sample Benefits */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <Package className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Same quality</h3>
            <p className="text-sm text-muted-foreground">Identical materials as your order</p>
          </div>
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <Truck className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Prompt delivery</h3>
            <p className="text-sm text-muted-foreground">2-4 days with care</p>
          </div>
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Patient timeline</h3>
            <p className="text-sm text-muted-foreground">30 days to decide with community pricing</p>
          </div>
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Cost honored</h3>
            <p className="text-sm text-muted-foreground">Respectfully applied to your order</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sample Selection */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-medium text-foreground mb-6">
              Select Your Samples
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {sampleProducts.map((sample) => (
                <div
                  key={sample.id}
                  className={`bg-background rounded-xl p-6 border transition-all duration-200 cursor-pointer ${
                    selectedSamples.includes(sample.id)
                      ? "border-primary ring-2 ring-primary/20 shadow-medium"
                      : "border-primary/5 hover:border-primary/20 shadow-soft"
                  }`}
                  onClick={() => toggleSample(sample.id)}
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-4 bg-background">
                    {sample.image ? (
                      <img src={sample.image} alt={sample.name} className="w-full h-full object-cover" loading="lazy" />
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
                    <div className="text-lg font-medium text-foreground">
                      ${sample.price}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {sample.leadTime}
                    </Badge>
                  </div>
                  
                  {selectedSamples.includes(sample.id) && (
                    <div className="mt-3 flex items-center gap-2 text-primary">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Selected</span>
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
                <p className="text-muted-foreground text-center py-8">Select samples to get started</p>
              ) : (
                <>
                  <SampleOrderFlow mode="inline" selectedSamples={selectedSamples} hideSelection />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => {
                      toast({
                        title: "Custom sample",
                        description: "Custom sample feature coming soon.",
                      });
                    }}
                  >
                    Add custom sample
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Customer Testimonials */}
        <div className="mt-12">
          <h3 className="text-2xl font-medium text-foreground mb-8 text-center">
            Community voices
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-background rounded-xl p-6 shadow-soft border border-primary/5"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <blockquote className="text-muted-foreground mb-4 italic">
                  "{testimonial.quote}"
                </blockquote>
                
                <div>
                  <div className="font-medium text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SampleOrdering;