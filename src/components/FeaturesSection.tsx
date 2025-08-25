import { Button } from "@/components/ui/button";
import { Ruler, Layers, Scissors, Factory, Truck, Upload, MessageSquare } from "lucide-react";

const features = [
  {
    icon: Ruler,
    title: "Patternmaking",
    description: "From sketches or tech packs."
  },
  {
    icon: Layers,
    title: "Fabric Sourcing",
    description: "Knits, wovens, sustainable blends."
  },
  {
    icon: Scissors,
    title: "Sampling",
    description: "Fit and finish approvals."
  },
  {
    icon: Factory,
    title: "Production",
    description: "Scalable, quality-controlled lines."
  },
  {
    icon: Truck,
    title: "Fulfillment",
    description: "Global shipping & prep."
  }
];

const FeaturesSection = () => {
  return (
    <section className="mt-20 border-t border-primary/10 pt-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div 
              key={index}
              className="flex items-start gap-3 p-4 rounded-xl bg-background border border-primary/5 shadow-soft hover:shadow-medium transition-all duration-200"
            >
              <Icon className="w-5 h-5 mt-0.5 text-foreground" />
              <div>
                <div className="text-sm font-medium tracking-tight text-foreground">
                  {feature.title}
                </div>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <Button variant="hero" size="lg" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Tech Pack
        </Button>
        <Button variant="hero-secondary" size="lg" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Talk to Production
        </Button>
      </div>
    </section>
  );
};

export default FeaturesSection;