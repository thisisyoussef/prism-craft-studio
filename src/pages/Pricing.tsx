import Navigation from "@/components/Navigation";
import PricingCalculator from "@/components/PricingCalculator";

const Pricing = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute inset-0 gradient-subtle opacity-30 pointer-events-none"></div>
      <Navigation />
      <div className="relative z-10">
        <PricingCalculator />
      </div>
    </div>
  );
};

export default Pricing;
