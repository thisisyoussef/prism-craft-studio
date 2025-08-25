import { Button } from "@/components/ui/button";
import { FileText, Play, Shirt, Leaf, Clock } from "lucide-react";
import heroImage from "@/assets/hero-manufacturing.jpg";
import ProductCustomizer from "./ProductCustomizer";
import SampleOrderFlow from "./SampleOrderFlow";

const HeroSection = () => {
  return (
    <main className="relative z-10 px-6 pt-12 pb-24 md:pt-24">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h1 className="text-5xl md:text-6xl font-medium tracking-tight leading-[1.1] mb-6 text-foreground">
              Transparent B2B custom apparel with real-time pricing
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Get instant quotes, track production stages, and work with professional designers. Built for teams ordering 50-500 pieces with complete transparency.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <ProductCustomizer />
              <SampleOrderFlow />
            </div>
            
            <div className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-2">
                <img 
                  src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=80&auto=format&fit=crop" 
                  className="w-8 h-8 rounded-full border-2 border-background shadow-soft" 
                  alt="Client testimonial"
                />
                <img 
                  src="https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=80&auto=format&fit=crop" 
                  className="w-8 h-8 rounded-full border-2 border-background shadow-soft" 
                  alt="Client testimonial"
                />
                <img 
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=80&auto=format&fit=crop" 
                  className="w-8 h-8 rounded-full border-2 border-background shadow-soft" 
                  alt="Client testimonial"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">4.9/5</span> from over 2,000 brand partners
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            {/* Gradient background blur */}
            <div className="absolute -inset-4 opacity-30 blur-3xl rounded-full gradient-hero"></div>
            
            {/* Main card */}
            <div className="relative bg-card-secondary rounded-2xl overflow-hidden shadow-large border border-primary/5">
              <div className="aspect-[4/3] bg-background relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-xl bg-primary/90 flex items-center justify-center shadow-large">
                    <div className="w-32 h-32 rounded-lg bg-background flex items-center justify-center border border-primary/10">
                      <Shirt className="w-16 h-16 text-foreground" />
                    </div>
                  </div>
                </div>

                {/* Feature badges */}
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3">
                  <div className="px-3 py-2 bg-background rounded-lg text-xs font-medium text-foreground border border-primary/10 flex items-center gap-2 shadow-soft">
                <span className="inline-flex w-2.5 h-2.5 rounded-full bg-success"></span>
                50+ MOQ
                  </div>
                  <div className="px-3 py-2 bg-background rounded-lg text-xs font-medium text-foreground border border-primary/10 flex items-center gap-2 shadow-soft">
                    <Leaf className="w-3.5 h-3.5" />
                    Organic options
                  </div>
                  <div className="px-3 py-2 bg-background rounded-lg text-xs font-medium text-foreground border border-primary/10 flex items-center gap-2 shadow-soft">
                <Clock className="w-3.5 h-3.5" />
                7-14 days
                  </div>
                </div>
              </div>

              {/* Card content */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-lg font-medium tracking-tight text-foreground">Real-Time Pricing</div>
                  <div className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full">Live</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Instant quotes • Designer booking • Production tracking • Two-phase payments
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default HeroSection;