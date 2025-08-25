import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shirt, ShirtIcon } from "lucide-react";

const products = [
  {
    id: 1,
    name: "Premium Hoodies",
    category: "Hoodies",
    basePrice: 24.99,
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=400&auto=format&fit=crop",
    materials: ["Cotton Blend", "Organic Cotton", "Polyester"],
    colors: ["Black", "White", "Gray", "Navy", "Red"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    moq: 50,
    description: "Premium quality hoodies perfect for corporate merchandise and team wear."
  },
  {
    id: 2,
    name: "Classic T-Shirts",
    category: "T-Shirts",
    basePrice: 12.99,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400&auto=format&fit=crop",
    materials: ["100% Cotton", "Cotton Blend", "Tri-Blend"],
    colors: ["Black", "White", "Gray", "Navy", "Red", "Blue", "Green"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    moq: 50,
    description: "High-quality cotton tees ideal for events, promotions, and team uniforms."
  },
  {
    id: 3,
    name: "Performance Polos",
    category: "Polos",
    basePrice: 18.99,
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=400&auto=format&fit=crop",
    materials: ["Moisture-Wicking", "Cotton Blend", "Performance Poly"],
    colors: ["Black", "White", "Navy", "Gray", "Royal Blue"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    moq: 50,
    description: "Professional polo shirts with moisture-wicking technology."
  },
  {
    id: 4,
    name: "Crew Sweatshirts",
    category: "Sweatshirts",
    basePrice: 22.99,
    image: "https://images.unsplash.com/photo-1548804915-9c7b41b4a2d0?q=80&w=400&auto=format&fit=crop",
    materials: ["Cotton Fleece", "Organic Cotton", "Recycled Poly"],
    colors: ["Black", "White", "Gray", "Navy", "Maroon"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    moq: 50,
    description: "Comfortable crew neck sweatshirts for casual corporate wear."
  }
];

const categories = ["All", "T-Shirts", "Hoodies", "Polos", "Sweatshirts"];

const ProductCatalog = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredProducts = selectedCategory === "All" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <section id="products" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-medium tracking-tight text-foreground mb-4">
            Browse Our Product Catalog
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            High-quality apparel with real-time pricing. All products available with 50+ piece minimums and complete customization options.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-2xl overflow-hidden shadow-soft border border-primary/5 hover:shadow-medium transition-all duration-200 group"
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                    MOQ {product.moq}+
                  </Badge>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {product.description}
                </p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-medium text-foreground">
                    ${product.basePrice}
                    <span className="text-sm text-muted-foreground font-normal">/piece</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {product.colors.length} colors
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <Button variant="hero" className="w-full">
                    Get Quote
                  </Button>
                  <Button variant="ghost" className="w-full">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-card-secondary rounded-2xl p-8 border border-primary/5">
            <h3 className="text-2xl font-medium text-foreground mb-4">
              Need Something Custom?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Work with our design team to create exactly what you need. From pattern development to final production.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg">
                Book Designer Consultation
              </Button>
              <Button variant="hero-secondary" size="lg">
                Upload Your Design
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductCatalog;