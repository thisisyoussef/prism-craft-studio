import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import ProductCatalog from "@/components/ProductCatalog";
import PricingCalculator from "@/components/PricingCalculator";
import SampleOrdering from "@/components/SampleOrdering";

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background">
      
      <Navigation />
      <HeroSection />
      
      {/* Core Platform Features for Organizations & Businesses */}
      <ProductCatalog />
      <PricingCalculator />
      <SampleOrdering />
      
      <div className="relative z-10 px-6 max-w-6xl mx-auto">
        <FeaturesSection />
      </div>
    </div>
  );
};

export default Index;
