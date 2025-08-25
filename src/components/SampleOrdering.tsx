import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Clock, CheckCircle, Star } from "lucide-react";
import SampleOrderFlow from "./SampleOrderFlow";

const SampleOrdering = () => {
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);

  const sampleProducts = [
    {
      id: "t-shirt-cotton",
      name: "Classic Cotton T-Shirt",
      price: 8.99,
      description: "100% cotton, standard fit",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=300&auto=format&fit=crop",
      leadTime: "2-3 days"
    },
    {
      id: "hoodie-premium", 
      name: "Premium Hoodie",
      price: 15.99,
      description: "Cotton blend, fleece-lined",
      image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=300&auto=format&fit=crop",
      leadTime: "3-4 days"
    },
    {
      id: "polo-performance",
      name: "Performance Polo",
      price: 12.99,
      description: "Moisture-wicking fabric",
      image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=300&auto=format&fit=crop",
      leadTime: "2-3 days"
    },
    {
      id: "sweatshirt-crew",
      name: "Crew Sweatshirt", 
      price: 13.99,
      description: "Cotton fleece, relaxed fit",
      image: "https://images.unsplash.com/photo-1548804915-9c7b41b4a2d0?q=80&w=300&auto=format&fit=crop",
      leadTime: "3-4 days"
    }
  ];

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
    <section id="samples" className="py-24 bg-card-secondary">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-medium tracking-tight text-foreground mb-4">
            Order Samples First
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Feel the quality before placing your bulk order. Fast shipping and detailed material information included.
          </p>
        </div>

        {/* Sample Benefits */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <Package className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Quality Guaranteed</h3>
            <p className="text-sm text-muted-foreground">Exact same materials as your bulk order</p>
          </div>
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <Truck className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Fast Shipping</h3>
            <p className="text-sm text-muted-foreground">2-4 business days to your door</p>
          </div>
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Quick Decision</h3>
            <p className="text-sm text-muted-foreground">Order bulk within 30 days for best pricing</p>
          </div>
          <div className="text-center p-6 bg-background rounded-xl border border-primary/5">
            <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Credit Applied</h3>
            <p className="text-sm text-muted-foreground">Sample cost credited to bulk orders</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
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
                  <div className="aspect-square rounded-lg overflow-hidden mb-4">
                    <img
                      src={sample.image}
                      alt={sample.name}
                      className="w-full h-full object-cover"
                    />
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

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-background rounded-xl p-6 shadow-medium border border-primary/5 sticky top-8">
              <h3 className="text-xl font-medium text-foreground mb-6">
                Sample Order
              </h3>
              
              {selectedSamples.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Select samples to get started
                </p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {selectedSamples.map((sampleId) => {
                      const sample = sampleProducts.find(p => p.id === sampleId);
                      return sample ? (
                        <div key={sampleId} className="flex justify-between items-center">
                          <span className="text-sm text-foreground">{sample.name}</span>
                          <span className="text-sm font-medium">${sample.price}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                  
                  <div className="border-t border-primary/10 pt-4 mb-6">
                    <div className="flex justify-between items-center text-lg font-medium">
                      <span>Total</span>
                      <span>${selectedTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      + shipping (calculated at checkout)
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <SampleOrderFlow />
                    <Button variant="ghost" size="sm" className="w-full">
                      Add Custom Sample
                    </Button>
                  </div>
                  
                  <div className="bg-coral/10 border border-coral/20 rounded-lg p-3 mt-4">
                    <p className="text-xs text-foreground">
                      💡 <strong>Pro tip:</strong> Sample costs are credited toward bulk orders placed within 30 days
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Customer Testimonials */}
        <div className="mt-16">
          <h3 className="text-2xl font-medium text-foreground mb-8 text-center">
            What Our Customers Say
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