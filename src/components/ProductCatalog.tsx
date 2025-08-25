import { useState } from "react";
import GarmentMockup, { type GarmentType } from './GarmentMockups'
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const products = [
  {
    id: 1,
    name: "Classic T-Shirts",
    category: "T-Shirts",
    basePrice: 13.0,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400&auto=format&fit=crop",
    materials: ["100% Cotton", "Cotton Blend", "Tri-Blend"],
    colors: ["Black", "White", "Gray", "Navy", "Red", "Blue", "Green"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    moq: 50,
    description: "High-quality cotton tees ideal for events, promotions, and team uniforms. Shipping included."
  },
  {
    id: 2,
    name: "Long Sleeve Shirt",
    category: "Long Sleeve",
    basePrice: 15.5,
    image: "https://images.unsplash.com/photo-1520975922284-9d8de22c6a67?q=80&w=400&auto=format&fit=crop",
    materials: ["100% Cotton", "Cotton Blend"],
    colors: ["Black", "White", "Gray", "Navy"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    moq: 50,
    description: "Versatile long sleeve shirts for teams and events. Shipping included."
  },
  {
    id: 3,
    name: "Cotton Crewneck",
    category: "Crewnecks",
    basePrice: 17.5,
    image: "https://images.unsplash.com/photo-1548804915-9c7b41b4a2d0?q=80&w=400&auto=format&fit=crop",
    materials: ["Cotton Fleece", "Organic Cotton"],
    colors: ["Black", "White", "Gray", "Navy"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    moq: 50,
    description: "Comfortable cotton crewneck with a clean fit. Shipping included."
  },
  {
    id: 4,
    name: "Fleece Crewneck",
    category: "Crewnecks",
    basePrice: 19.0,
    image: "https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=400&auto=format&fit=crop",
    materials: ["Cotton Fleece", "Recycled Poly"],
    colors: ["Black", "White", "Gray", "Navy", "Maroon"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    moq: 50,
    description: "Cozy fleece crewneck for everyday wear. Shipping included."
  },
  {
    id: 5,
    name: "Hoodie",
    category: "Hoodies",
    basePrice: 24.0,
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=400&auto=format&fit=crop",
    materials: ["Cotton Blend", "Organic Cotton", "Polyester"],
    colors: ["Black", "White", "Gray", "Navy", "Red"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    moq: 50,
    description: "Premium quality hoodie perfect for merchandise and team wear. Shipping included."
  },
  {
    id: 6,
    name: "Modest Hoodie",
    category: "Hoodies",
    basePrice: 22.5,
    image: "https://images.unsplash.com/photo-1618354691373-d851cba60d5a?q=80&w=400&auto=format&fit=crop",
    materials: ["Cotton Blend", "Organic Cotton"],
    colors: ["Black", "White", "Gray", "Navy"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    moq: 50,
    description: "Relaxed, modest-fit hoodie for all-day comfort. Shipping included."
  }
];

const categories = ["All", "T-Shirts", "Long Sleeve", "Crewnecks", "Hoodies"];

const ProductCatalog = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const navigate = useNavigate();

  const filteredProducts = selectedCategory === "All" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <section id="products" className="py-16 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-medium tracking-tight text-foreground mb-4">
            Browse Our Product Catalog
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            High-quality apparel with real-time pricing. All products available with 50+ piece minimums and complete customization options.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-2xl overflow-hidden shadow-soft border border-primary/5 hover:shadow-medium transition-all duration-200 group"
            >
              <div className="aspect-square relative overflow-hidden flex items-center justify-center bg-background">
                {(() => {
                  const map: Record<string, GarmentType> = {
                    'T-Shirts': 't-shirt',
                    'Long Sleeve': 't-shirt',
                    'Crewnecks': 'sweatshirt',
                    'Hoodies': 'hoodie',
                  }
                  const type: GarmentType = map[product.category] || 't-shirt'
                  return (
                    <div className="w-full h-full p-6">
                      <GarmentMockup type={type} view="front" color="#ffffff" />
                    </div>
                  )
                })()}
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
                    <span className="text-sm text-muted-foreground font-normal">/piece • shipping included</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {product.colors.length} colors
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    variant="hero" 
                    className="w-full"
                    onClick={() => navigate('/customize')}
                  >
                    Customize Product
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => navigate('/catalog')}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-card-secondary rounded-2xl p-8 border border-primary/5">
            <h3 className="text-2xl font-medium text-foreground mb-4">
              Need Something Custom?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Work with our design team to create exactly what you need. From pattern development to final production.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => navigate('/designers')}
              >
                Book Designer Consultation
              </Button>
              <Button 
                variant="hero-secondary" 
                size="lg"
                onClick={() => navigate('/customize')}
              >
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