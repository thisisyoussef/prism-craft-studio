import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PricingCalculator from "@/components/PricingCalculator";

const Pricing = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <PricingCalculator />
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
      <Footer />
    </div>
  );
};

export default Pricing;
