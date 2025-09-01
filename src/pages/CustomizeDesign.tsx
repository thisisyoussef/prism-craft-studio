import Navigation from "@/components/Navigation";
import ProductCustomizer from "@/components/ProductCustomizer";
import { Link } from "react-router-dom";

const CustomizeDesign = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-medium text-foreground">Design</h1>
            <p className="text-muted-foreground">Choose product, colors, and placements.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="font-medium">Design</span>
            <span className="text-muted-foreground">→</span>
            <Link to="/customize/quantities" className="text-muted-foreground hover:text-foreground">Quantities</Link>
            <span className="text-muted-foreground">→</span>
            <Link to="/customize/order" className="text-muted-foreground hover:text-foreground">Order</Link>
          </div>
        </div>
        <ProductCustomizer mode="page" step="design" />
        <div className="mt-6 flex justify-end">
          <Link to="/customize/quantities" className="inline-flex h-10 items-center rounded-md bg-foreground px-4 text-background hover:opacity-90">Next: Quantities</Link>
        </div>
      </div>
    </div>
  );
};

export default CustomizeDesign;

