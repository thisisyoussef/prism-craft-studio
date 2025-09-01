import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProductCatalog from "@/components/ProductCatalog";

const Catalog = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10">
        <ProductCatalog />
      </div>
      <div className="h-16 md:hidden" aria-hidden="true" />
      <Footer />
    </div>
  );
};

export default Catalog;
