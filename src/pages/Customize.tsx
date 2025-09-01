import Navigation from "@/components/Navigation";
import ProductCustomizer from "@/components/ProductCustomizer";
import { ScrollReveal } from "@/components/ScrollReveal";

const Customize = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
        <div className="mb-6">
          <ScrollReveal variant="fade-up" distancePx={18}>
            <h1 className="text-3xl font-medium text-foreground">Design your order</h1>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delayMs={80} distancePx={12}>
            <p className="text-muted-foreground">Choose products, colors, and sizes for your group. See how they'll look before ordering.</p>
          </ScrollReveal>
        </div>
        <ScrollReveal variant="fade-up" delayMs={120}>
          <ProductCustomizer mode="page" />
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Customize;
