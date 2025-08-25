import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingDown, Upload, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PricingCalculator = () => {
  const [quantity, setQuantity] = useState(100);
  const [productType, setProductType] = useState("t-shirt");
  const [customization, setCustomization] = useState("screen-print");
  const [price, setPrice] = useState(0);
  const [savings, setSavings] = useState(0);

  const productPrices = {
    "t-shirt": { base: 12.99, name: "Classic T-Shirt" },
    "hoodie": { base: 24.99, name: "Premium Hoodie" },
    "polo": { base: 18.99, name: "Performance Polo" },
    "sweatshirt": { base: 22.99, name: "Crew Sweatshirt" }
  };

  const customizationPrices = {
    "screen-print": { cost: 3.99, name: "Screen Printing" },
    "embroidery": { cost: 5.99, name: "Embroidery" },
    "vinyl": { cost: 2.99, name: "Vinyl Transfer" },
    "dtg": { cost: 4.99, name: "Direct-to-Garment" }
  };

  const quantityTiers = [
    { min: 50, max: 99, discount: 0 },
    { min: 100, max: 249, discount: 0.05 },
    { min: 250, max: 499, discount: 0.10 },
    { min: 500, max: 999, discount: 0.15 },
    { min: 1000, max: Infinity, discount: 0.20 }
  ];

  useEffect(() => {
    const basePrice = productPrices[productType as keyof typeof productPrices].base;
    const customizationCost = customizationPrices[customization as keyof typeof customizationPrices].cost;
    
    const tier = quantityTiers.find(t => quantity >= t.min && quantity <= t.max);
    const discount = tier?.discount || 0;
    
    const unitPrice = (basePrice + customizationCost) * (1 - discount);
    const totalPrice = unitPrice * quantity;
    
    const originalPrice = (basePrice + customizationCost) * quantity;
    const currentSavings = originalPrice - totalPrice;
    
    setPrice(totalPrice);
    setSavings(currentSavings);
  }, [quantity, productType, customization]);

  const nextTier = quantityTiers.find(t => quantity < t.min);
  const currentDiscount = quantityTiers.find(t => quantity >= t.min && quantity <= t.max)?.discount || 0;

  return (
    <section id="pricing" className="py-16 bg-card-secondary">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-medium tracking-tight text-foreground mb-4">
            Real-Time Pricing Calculator
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get instant, transparent pricing with no hidden fees. See exactly what you'll pay before placing your order.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Calculator Form */}
          <div className="bg-background rounded-2xl p-8 shadow-medium border border-primary/5">
            <h3 className="text-xl font-medium text-foreground mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Configure Your Order
            </h3>

            <div className="space-y-6">
              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Product Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(productPrices).map(([key, product]) => (
                    <button
                      key={key}
                      onClick={() => setProductType(key)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                        productType === key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary/20 hover:border-primary/40"
                      }`}
                    >
                      {product.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Quantity
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="50"
                    max="10000"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 50)}
                    className="w-full p-3 border border-primary/20 rounded-lg focus:border-primary focus:outline-none text-lg font-medium"
                  />
                  <div className="absolute right-3 top-3 text-sm text-muted-foreground">
                    pieces
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {[50, 100, 250, 500, 1000].map((qty) => (
                    <button
                      key={qty}
                      onClick={() => setQuantity(qty)}
                      className="px-3 py-1 text-xs border border-primary/20 rounded-full hover:border-primary/40 transition-colors"
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customization */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Customization Method
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(customizationPrices).map(([key, method]) => (
                    <button
                      key={key}
                      onClick={() => setCustomization(key)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                        customization === key
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-primary/20 hover:border-primary/40"
                      }`}
                    >
                      <span>{method.name}</span>
                      <span className="text-xs text-muted-foreground">
                        +${method.cost}/piece
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Design */}
              <div 
                className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => {
                  console.log("Upload design area clicked");
                  toast({
                    title: "Design Upload",
                    description: "File upload coming soon!"
                  });
                }}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Upload Your Design
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, PDF, AI files up to 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Results */}
          <div className="bg-background rounded-2xl p-8 shadow-medium border border-primary/5 sticky top-8">
            <h3 className="text-xl font-medium text-foreground mb-6">
              Your Quote
            </h3>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Product</span>
                <span className="font-medium">
                  {productPrices[productType as keyof typeof productPrices].name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-medium">{quantity.toLocaleString()} pieces</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Customization</span>
                <span className="font-medium">
                  {customizationPrices[customization as keyof typeof customizationPrices].name}
                </span>
              </div>
              {currentDiscount > 0 && (
                <div className="flex justify-between items-center text-success">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    Volume Discount
                  </span>
                  <span className="font-medium">-{(currentDiscount * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>

            <div className="border-t border-primary/10 pt-4 mb-6">
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Total Cost</span>
                <span className="text-2xl text-foreground">
                  ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                <span>Per piece</span>
                <span>${(price / quantity).toFixed(2)}</span>
              </div>
              {savings > 0 && (
                <div className="text-sm text-success mt-2">
                  You save ${savings.toFixed(2)} with volume pricing!
                </div>
              )}
            </div>

            {nextTier && (
              <div className="bg-coral/10 border border-coral/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-foreground">
                  <strong>Save more!</strong> Order {nextTier.min} pieces to get {(nextTier.discount * 100).toFixed(0)}% off
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={() => {
                  console.log("Get Quote button clicked");
                  toast({
                    title: "Quote Generated!",
                    description: "Your custom quote is ready. We'll send details to your email."
                  });
                }}
              >
                Get Official Quote
              </Button>
              
              <Button 
                variant="hero-secondary" 
                size="lg" 
                className="w-full"
                onClick={() => {
                  console.log("Order Sample button clicked");
                  toast({
                    title: "Sample Order Started!",
                    description: "Opening sample selection..."
                  });
                }}
              >
                Order Sample First
              </Button>
            </div>

            <div className="text-center mt-4">
              <p className="text-xs text-muted-foreground">
                40% deposit • 60% before shipping • No hidden fees
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingCalculator;