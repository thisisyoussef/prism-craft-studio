import Navigation from "@/components/Navigation";
import PricingCalculator from "@/components/PricingCalculator";
import { ScrollReveal } from "@/components/ScrollReveal";

const Pricing = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <ScrollReveal variant="fade-up" distancePx={24}>
          <PricingCalculator />
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Pricing;
