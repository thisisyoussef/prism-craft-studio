import Navigation from "@/components/Navigation";
import ProductCustomizer from "@/components/ProductCustomizer";

const Customize = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute inset-0 gradient-subtle opacity-30 pointer-events-none"></div>
      <Navigation />
      <div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-medium text-foreground">Customize Your Order</h1>
          <p className="text-muted-foreground">Configure products, colors, and sizes for your organization or business. Preview mockups with zoom.</p>
        </div>
        <ProductCustomizer mode="page" />
      </div>
    </div>
  );
};

export default Customize;
