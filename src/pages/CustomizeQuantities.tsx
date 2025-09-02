import Navigation from "@/components/Navigation";
import ProductCustomizer from "@/components/ProductCustomizer";
import { Link } from "react-router-dom";

const Breadcrumbs = () => (
  <div className="flex items-center justify-center gap-3 text-sm mb-4">
    <Link to="/customize/design" className="text-muted-foreground">Design</Link>
    <span className="text-muted-foreground">›</span>
    <Link to="/customize/quantities" className="font-medium text-foreground">Quantities</Link>
    <span className="text-muted-foreground">›</span>
    <Link to="/customize/order" className="text-muted-foreground">Order</Link>
  </div>
)

export default function CustomizeQuantities() {
  return (
    <div className="relative min-h-screen bg-background">
      <Navigation />
      <div className="relative z-10 px-6 max-w-6xl mx-auto py-6">
        <Breadcrumbs />
        <h1 className="text-2xl font-medium mb-4">Quantities</h1>
        <ProductCustomizer mode="page" step="quantities" />
      </div>
    </div>
  )
}

