import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Plus, X, Upload } from "lucide-react";
import { z } from "zod";

const CATEGORIES = [
  "T-Shirts",
  "Hoodies", 
  "Polos",
  "Sweatshirts",
  "Tank Tops",
  "Long Sleeves",
  "Jackets",
  "Pants",
  "Shorts",
  "Accessories"
];

const COMMON_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Navy", hex: "#001F3F" },
  { name: "Gray", hex: "#808080" },
  { name: "Red", hex: "#FF0000" },
  { name: "Blue", hex: "#0074D9" },
  { name: "Green", hex: "#2ECC40" },
  { name: "Yellow", hex: "#FFDC00" },
  { name: "Purple", hex: "#B10DC9" },
  { name: "Orange", hex: "#FF851B" },
  { name: "Maroon", hex: "#85144B" },
  { name: "Royal Blue", hex: "#4169E1" }
];

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const ProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(100),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  base_price: z.number().min(0.01, "Base price must be greater than 0"),
  moq: z.number().int().min(1, "MOQ must be at least 1").optional(),
});

interface ColorVariant {
  id: string;
  name: string;
  hex: string;
  stock: number;
  price?: number;
}

export default function AdminNewProduct() {
  const navigate = useNavigate();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { toast } = useToast();
  const qc = useQueryClient();

  const isAdmin = profile?.role === "admin";

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    base_price: "",
    moq: "50"
  });

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Custom color/size inputs
  const [customColor, setCustomColor] = useState({ name: "", hex: "#000000" });
  const [customSize, setCustomSize] = useState("");

  const createProduct = useMutation({
    mutationFn: async (data: {
      product: z.infer<typeof ProductSchema>;
      sizes: string[];
      variants: ColorVariant[];
      imageFile?: File;
    }) => {
      const { product, sizes, variants, imageFile } = data;

      // Validate product data
      const validatedProduct = ProductSchema.parse(product);

      // Create the product first
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          name: validatedProduct.name,
          description: validatedProduct.description || null,
          category: validatedProduct.category,
          base_price: validatedProduct.base_price,
          available_sizes: sizes,
          available_colors: variants.map(v => v.name),
          customization_options: {
            moq: validatedProduct.moq || 50,
            active: true
          }
        })
        .select("id")
        .single();

      if (productError) throw productError;

      const productId = newProduct.id;

      // Upload product image if provided
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `products/${productId}/cover/${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, imageFile, { 
            cacheControl: '3600', 
            upsert: true, 
            contentType: imageFile.type 
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(path);

        imageUrl = publicUrlData.publicUrl;

        // Update product with image URL
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', productId);

        if (updateError) throw updateError;
      }

      // Create product variants
      if (variants.length > 0) {
        const variantInserts = variants.map(variant => ({
          product_id: productId,
          color_name: variant.name,
          color_hex: variant.hex,
          stock: variant.stock,
          price: variant.price || null,
          image_url: imageUrl, // Use product image as default
          front_image_url: null,
          back_image_url: null,
          sleeve_image_url: null,
          active: true
        }));

        const { error: variantError } = await (supabase as any)
          .from('product_variants')
          .insert(variantInserts);

        if (variantError) throw variantError;
      }

      return { productId, imageUrl };
    },
    onSuccess: ({ productId }) => {
      toast({
        title: "Product created successfully!",
        description: "The new product has been added to your inventory."
      });
      
      // Invalidate relevant queries
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      qc.invalidateQueries({ queryKey: ["catalog-products"] });
      qc.invalidateQueries({ queryKey: ["sample-products"] });
      
      // Navigate to the product editor
      navigate(`/admin/inventory/${productId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create product",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addColorVariant = (color: { name: string; hex: string }) => {
    const id = crypto.randomUUID();
    setColorVariants(prev => [...prev, {
      id,
      name: color.name,
      hex: color.hex,
      stock: 0,
      price: undefined
    }]);
  };

  const removeColorVariant = (id: string) => {
    setColorVariants(prev => prev.filter(v => v.id !== id));
  };

  const updateColorVariant = (id: string, updates: Partial<ColorVariant>) => {
    setColorVariants(prev => prev.map(v => 
      v.id === id ? { ...v, ...updates } : v
    ));
  };

  const addCustomColor = () => {
    if (customColor.name.trim()) {
      addColorVariant(customColor);
      setCustomColor({ name: "", hex: "#000000" });
    }
  };

  const addSize = (size: string) => {
    if (!selectedSizes.includes(size)) {
      setSelectedSizes(prev => [...prev, size]);
    }
  };

  const removeSize = (size: string) => {
    setSelectedSizes(prev => prev.filter(s => s !== size));
  };

  const addCustomSize = () => {
    if (customSize.trim() && !selectedSizes.includes(customSize.trim())) {
      addSize(customSize.trim());
      setCustomSize("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        base_price: parseFloat(formData.base_price),
        moq: formData.moq ? parseInt(formData.moq) : undefined
      };

      createProduct.mutate({
        product: productData,
        sizes: selectedSizes,
        variants: colorVariants,
        imageFile: productImage || undefined
      });
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">You do not have access to this page.</p>
        <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/inventory")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Inventory
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Create New Product</h1>
            <p className="text-sm text-muted-foreground">Add a new product to your catalog</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the core details for your new product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Premium Cotton T-Shirt"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the product features, materials, and benefits..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_price">Base Price ($) *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moq">Minimum Order Quantity</Label>
                  <Input
                    id="moq"
                    type="number"
                    min="1"
                    value={formData.moq}
                    onChange={(e) => setFormData(prev => ({ ...prev, moq: e.target.value }))}
                    placeholder="50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Image */}
          <Card>
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
              <CardDescription>Upload a main product image (optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Product preview" 
                    className="w-24 h-24 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="image">Upload Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-auto"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: 800x800px, JPG or PNG
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Sizes */}
          <Card>
            <CardHeader>
              <CardTitle>Available Sizes</CardTitle>
              <CardDescription>Select the sizes available for this product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {COMMON_SIZES.map(size => (
                  <Button
                    key={size}
                    type="button"
                    variant={selectedSizes.includes(size) ? "default" : "outline"}
                    size="sm"
                    onClick={() => selectedSizes.includes(size) ? removeSize(size) : addSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Custom size"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSize())}
                  className="w-32"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCustomSize}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {selectedSizes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSizes.map(size => (
                    <Badge key={size} variant="secondary" className="gap-1">
                      {size}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeSize(size)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Color Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Color Variants</CardTitle>
              <CardDescription>Add color options with individual stock and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Common Colors */}
              <div>
                <Label className="text-sm font-medium">Quick Add Colors</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COMMON_COLORS.map(color => (
                    <Button
                      key={color.name}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addColorVariant(color)}
                      disabled={colorVariants.some(v => v.hex === color.hex)}
                      className="gap-2"
                    >
                      <div 
                        className="w-4 h-4 rounded-full border" 
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Color */}
              <div>
                <Label className="text-sm font-medium">Add Custom Color</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Color name"
                    value={customColor.name}
                    onChange={(e) => setCustomColor(prev => ({ ...prev, name: e.target.value }))}
                    className="w-32"
                  />
                  <Input
                    type="color"
                    value={customColor.hex}
                    onChange={(e) => setCustomColor(prev => ({ ...prev, hex: e.target.value }))}
                    className="w-16 p-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addCustomColor}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Color Variants List */}
              {colorVariants.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Color Variants</Label>
                  {colorVariants.map(variant => (
                    <div key={variant.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div 
                        className="w-8 h-8 rounded-full border-2" 
                        style={{ backgroundColor: variant.hex }}
                      />
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Color Name</Label>
                          <Input
                            value={variant.name}
                            onChange={(e) => updateColorVariant(variant.id, { name: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Stock</Label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.stock}
                            onChange={(e) => updateColorVariant(variant.id, { stock: parseInt(e.target.value) || 0 })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Price Override ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price || ""}
                            onChange={(e) => updateColorVariant(variant.id, { 
                              price: e.target.value ? parseFloat(e.target.value) : undefined 
                            })}
                            placeholder="Use base price"
                            className="h-8"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeColorVariant(variant.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/admin/inventory")}
              disabled={createProduct.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createProduct.isPending || !formData.name || !formData.category || !formData.base_price}
            >
              {createProduct.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Product"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
