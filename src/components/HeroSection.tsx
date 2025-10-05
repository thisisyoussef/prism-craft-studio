import { Button } from "@/components/ui/button";
import { FileText, Play, Shirt, Heart, Clock } from "lucide-react";
import heroImage from "@/assets/hero-manufacturing.jpg";
import cardImage from "@/assets/card_img.jpeg";
import ProductCustomizer from "./ProductCustomizer";

const HeroSection = () => {
  return (
    <main className="relative z-10 px-6 pt-10 pb-16 md:pt-24 md:pb-20 lg:pt-28">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div>
            <h1 className="text-5xl md:text-6xl font-medium tracking-tight leading-[1.1] mb-6 text-foreground">
              Custom apparel, thoughtfully made
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Design for your team or community. We guide you from idea to delivery. Minimum 50 pieces.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <ProductCustomizer />
            </div>
            
            <div className="mt-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                Transparent pricing, no surprises
              </span>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            {/* Gradient background blur */}
            <div className="absolute -inset-4 opacity-30 blur-3xl rounded-full gradient-hero"></div>
            
            {/* Main card */}
            <div className="relative bg-card-secondary rounded-2xl overflow-hidden shadow-large border border-primary/5">
              <div className="relative">
                <img 
                  src={cardImage}
                  alt="Custom apparel showcase"
                  loading="eager"
                  decoding="async"
                  srcSet={`${cardImage} 800w`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
                  className="w-full h-auto object-cover"
                />

                {/* Top-right pill */}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full shadow-soft">
                    Instant quote
                  </span>
                </div>

                {/* Bottom feature badges */}
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3">
                  <div className="px-3 py-2 bg-background/95 backdrop-blur rounded-lg text-xs font-medium text-foreground border border-primary/10 flex items-center gap-2 shadow-soft">
                    <span className="inline-flex w-2.5 h-2.5 rounded-full bg-success"></span>
                    50+ pieces
                  </div>
                  <div className="px-3 py-2 bg-background/95 backdrop-blur rounded-lg text-xs font-medium text-foreground border border-primary/10 flex items-center gap-2 shadow-soft">
                    <Heart className="w-3.5 h-3.5" />
                    Tailored production
                  </div>
                  <div className="px-3 py-2 bg-background/95 backdrop-blur rounded-lg text-xs font-medium text-foreground border border-primary/10 flex items-center gap-2 shadow-soft">
                    <Clock className="w-3.5 h-3.5" />
                    2–3 weeks
                  </div>
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