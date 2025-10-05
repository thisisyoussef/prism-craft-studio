import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import { BusinessReviews } from "@/components/BusinessReviews";
import FeaturesSection from "@/components/FeaturesSection";
import ProductCatalog from "@/components/ProductCatalog";
import PricingCalculator from "@/components/PricingCalculator";
import { ScrollReveal } from "@/components/ScrollReveal";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <SEO
        title="PTRN - Custom Apparel for Organizations & Businesses"
        description="Transparent custom apparel with real-time pricing, designer collaboration, and full production tracking."
        canonicalUrl={typeof window !== 'undefined' ? window.location.origin + '/' : undefined}
        ogImage="/logo.png"
      />
      <Navigation />

      <ScrollReveal variant="fade-up" distancePx={28}>
        <HeroSection />
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delayMs={80}>
        <BusinessReviews />
      </ScrollReveal>

      {/* Core Platform Features for Organizations & Businesses */}
      <ScrollReveal variant="fade-up" delayMs={120}>
        <ProductCatalog />
      </ScrollReveal>
      <ScrollReveal variant="fade-up" delayMs={160}>
        <PricingCalculator />
      </ScrollReveal>
      {/* Samples section removed */}

      <div className="relative z-10 px-6 max-w-6xl mx-auto">
        <ScrollReveal variant="fade-up" delayMs={240}>
          <FeaturesSection />
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Index;
