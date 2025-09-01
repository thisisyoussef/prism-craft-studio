import Navigation from "@/components/Navigation";
import ProductCustomizer from "@/components/ProductCustomizer";
import { Link } from "react-router-dom";

const CustomizeQuantities = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-medium text-foreground">Quantities</h1>
            <p className="text-muted-foreground">Distribute sizes and set total quantity.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <Link to="/customize/design" className="text-muted-foreground hover:text-foreground">Design</Link>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium">Quantities</span>
            <span className="text-muted-foreground">→</span>
            <Link to="/customize/order" className="text-muted-foreground hover:text-foreground">Order</Link>
          </div>
        </div>
        <ProductCustomizer mode="page" step="quantities" />
        <div className="mt-6 flex justify-between">
          <Link to="/customize/design" className="inline-flex h-10 items-center rounded-md border px-4 hover:bg-muted">Back</Link>
          <Link to="/customize/order" className="inline-flex h-10 items-center rounded-md bg-foreground px-4 text-background hover:opacity-90">Next: Order</Link>
        </div>
      </div>
    </div>
  );
};

export default CustomizeQuantities;

