import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProductCustomizer from "@/components/ProductCustomizer";

const Customize = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-medium text-foreground">Design your order</h1>
          <p className="text-muted-foreground">Choose products, colors, and sizes for your group. See how they'll look before ordering.</p>
        </div>
        <ProductCustomizer mode="page" />
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
      <Footer />
    </div>
  );
};

export default Customize;
