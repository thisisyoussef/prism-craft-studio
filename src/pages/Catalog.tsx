import Navigation from "@/components/Navigation";
import ProductCatalog from "@/components/ProductCatalog";
import { ScrollReveal } from "@/components/ScrollReveal";

const Catalog = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <ScrollReveal variant="fade-up" distancePx={24}>
          <ProductCatalog />
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Catalog;
