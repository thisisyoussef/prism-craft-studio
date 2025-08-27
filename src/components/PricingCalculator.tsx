import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingDown, Upload, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePricingStore } from "@/lib/store";
import { PRODUCT_CATALOG } from "@/lib/products";

const PricingCalculator = () => {
  const navigate = useNavigate();
  const {
    quantity,
    productType,
    customization,
    price,
    savings,
    priceBreakdown,
    updateQuantity,
    updateProductType,
    updateCustomization,
  } = usePricingStore();

  const productPrices = Object.fromEntries(
    PRODUCT_CATALOG.map(p => [p.id, { base: p.basePrice, name: p.name }])
  ) as Record<string, { base: number; name: string }>;

  const customizationPrices = {
    "screen-print": { cost: 0, name: "Screen Printing" },
    "embroidery": { cost: 0, name: "Embroidery" },
    "vinyl": { cost: 0, name: "Vinyl Transfer" },
    "dtg": { cost: 0, name: "Direct-to-Garment" }
  };

  const quantityTiers = [
    { min: 50, max: 99, discount: 0 },
    { min: 100, max: 249, discount: 0.05 },
    { min: 250, max: 499, discount: 0.10 },
    { min: 500, max: 999, discount: 0.15 },
    { min: 1000, max: Infinity, discount: 0.20 }
  ];

  // pricing is computed in the store when updates occur

  const nextTier = quantityTiers.find(t => quantity < t.min);
  const currentDiscount = quantityTiers.find(t => quantity >= t.min && quantity <= t.max)?.discount || 0;

  return (
    <section id="pricing" className="py-16 bg-card-secondary">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-medium tracking-tight text-foreground mb-4">
            Calculate your cost
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Volume discounts applied automatically. All fees shown upfront.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Calculator Form */}
          <div className="bg-background rounded-2xl p-8 shadow-medium border border-primary/5">
            <h3 className="text-xl font-medium text-foreground mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Build your quote
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
                      onClick={() => updateProductType(key)}
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
                    onChange={(e) => updateQuantity(parseInt(e.target.value) || 50)}
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
                      onClick={() => updateQuantity(qty)}
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
                      onClick={() => updateCustomization(key)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                        customization === key
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-primary/20 hover:border-primary/40"
                      }`}
                    >
                      <span>{method.name}</span>
                      <span className="text-xs text-success">Included</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Design */}
              <div 
                className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => navigate('/customize')}
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
                  {productPrices[productType as keyof typeof productPrices]?.name ?? 'Select a product'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-medium">{quantity.toLocaleString()} pieces</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Customization</span>
                <span className="font-medium">
                  {customizationPrices[customization as keyof typeof customizationPrices]?.name ?? 'Select a method'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-success">Included</span>
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
                <span>${(price / Math.max(1, quantity)).toFixed(2)}</span>
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
                  Order {nextTier.min}+ pieces for {(nextTier.discount * 100).toFixed(0)}% off
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={() => navigate('/customize')}
              >
                Start designing
              </Button>
              
              <Button 
                variant="hero-secondary" 
                size="lg" 
                className="w-full"
                onClick={() => navigate('/samples')}
              >
                Get samples first
              </Button>
            </div>

            <div className="text-center mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Payment: 40% deposit • 60% before shipping • Design support included
              </p>
              {priceBreakdown && (
                <div className="text-[11px] text-muted-foreground">
                  <div>Base/unit: ${priceBreakdown.baseUnit.toFixed(2)}</div>
                  <div>Prints surcharge/unit: ${priceBreakdown.printsSurchargeUnit.toFixed(2)}</div>
                  <div>Discount: {(priceBreakdown.discountRate * 100).toFixed(0)}%</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingCalculator;