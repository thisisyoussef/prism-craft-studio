import Navigation from "@/components/Navigation";
import ProductCatalog from "@/components/ProductCatalog";

const Catalog = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <ProductCatalog />
      </div>
    </div>
  );
};

export default Catalog;
