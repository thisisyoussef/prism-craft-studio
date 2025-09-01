import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import { BusinessReviews } from "@/components/BusinessReviews";
import FeaturesSection from "@/components/FeaturesSection";
import ProductCatalog from "@/components/ProductCatalog";
import PricingCalculator from "@/components/PricingCalculator";
import SampleOrdering from "@/components/SampleOrdering";

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background">
      
      <Navigation />
      <HeroSection />
      <BusinessReviews />
      
      {/* Core Platform Features for Organizations & Businesses */}
      <ProductCatalog />
      <PricingCalculator />
      <SampleOrdering />
      
      <div className="relative z-10 px-6 max-w-6xl mx-auto">
        <FeaturesSection />
      </div>
      {/* Spacer so the fixed mobile bottom nav doesn't cover the footer */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <Footer />
    </div>
  );
};

export default Index;
