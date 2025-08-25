import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuthStore, useOrderStore, usePricingStore } from '@/lib/store'
import { Upload, FileText, Calculator, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthDialog from './AuthDialog'

const ProductCustomizer = () => {
  const [open, setOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [artworkFiles, setArtworkFiles] = useState<File[]>([])
  const [customText, setCustomText] = useState('')
  const [placement, setPlacement] = useState('')
  const [notes, setNotes] = useState('')

  const { user } = useAuthStore()
  const { addOrder } = useOrderStore()
  const { quantity, productType, customization, price, updateQuantity, updateProductType, updateCustomization, calculatePrice } = usePricingStore()

  const products = {
    't-shirt': { name: 'Classic T-Shirt', basePrice: 12.99 },
    'hoodie': { name: 'Premium Hoodie', basePrice: 24.99 },
    'polo': { name: 'Performance Polo', basePrice: 18.99 },
    'sweatshirt': { name: 'Crew Sweatshirt', basePrice: 22.99 }
  }

  const colors = ['Black', 'White', 'Gray', 'Navy', 'Red', 'Blue', 'Green', 'Purple']
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  const placements = ['Front Center', 'Front Left Chest', 'Back Center', 'Back Upper', 'Sleeve']

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setArtworkFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setArtworkFiles(prev => prev.filter((_, i) => i !== index))
  }

  const toggleColor = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    )
  }

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    )
  }

  const handleCreateOrder = async () => {
    if (!user) {
      toast.error('Please sign in to create an order')
      return
    }

    if (!selectedProduct || selectedColors.length === 0 || selectedSizes.length === 0) {
      toast.error('Please complete all required fields')
      return
    }

    try {
      const orderData = {
        company_id: user.id,
        user_id: user.id,
        product_type: selectedProduct,
        quantity,
        unit_price: price / quantity,
        total_price: price,
        customization: {
          colors: selectedColors,
          sizes: selectedSizes,
          artwork_files: artworkFiles.map(f => f.name),
          custom_text: customText,
          placement,
          method: customization,
          notes
        },
        status: 'quote_requested'
      }

      await addOrder(orderData)
      toast.success('Order created successfully!')
      setOpen(false)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create order')
    }
  }

  const resetForm = () => {
    setSelectedProduct('')
    setSelectedColors([])
    setSelectedSizes([])
    setArtworkFiles([])
    setCustomText('')
    setPlacement('')
    setNotes('')
  }

  const isFormValid = selectedProduct && selectedColors.length > 0 && selectedSizes.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" size="lg">
          <Calculator className="w-4 h-4" />
          Customize Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Customizer</DialogTitle>
          <DialogDescription>
            Configure your custom apparel order with real-time pricing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* Product Selection */}
            <div className="space-y-3">
              <Label>Product Type *</Label>
              <Select 
                value={selectedProduct} 
                onValueChange={(value) => {
                  setSelectedProduct(value)
                  updateProductType(value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(products).map(([key, product]) => (
                    <SelectItem key={key} value={key}>
                      {product.name} - ${product.basePrice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-3">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="50"
                max="10000"
                value={quantity}
                onChange={(e) => updateQuantity(parseInt(e.target.value) || 50)}
                placeholder="Minimum 50 pieces"
              />
              <div className="flex gap-2">
                {[50, 100, 250, 500, 1000].map((qty) => (
                  <Button
                    key={qty}
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(qty)}
                  >
                    {qty}
                  </Button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <Label>Colors * ({selectedColors.length} selected)</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <Badge
                    key={color}
                    variant={selectedColors.includes(color) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleColor(color)}
                  >
                    {color}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="space-y-3">
              <Label>Sizes * ({selectedSizes.length} selected)</Label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <Badge
                    key={size}
                    variant={selectedSizes.includes(size) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSize(size)}
                  >
                    {size}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Customization Method */}
            <div className="space-y-3">
              <Label>Customization Method</Label>
              <Select value={customization} onValueChange={updateCustomization}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="screen-print">Screen Printing (+$3.99)</SelectItem>
                  <SelectItem value="embroidery">Embroidery (+$5.99)</SelectItem>
                  <SelectItem value="vinyl">Vinyl Transfer (+$2.99)</SelectItem>
                  <SelectItem value="dtg">Direct-to-Garment (+$4.99)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Placement */}
            <div className="space-y-3">
              <Label>Design Placement</Label>
              <Select value={placement} onValueChange={setPlacement}>
                <SelectTrigger>
                  <SelectValue placeholder="Select placement" />
                </SelectTrigger>
                <SelectContent>
                  {placements.map((place) => (
                    <SelectItem key={place} value={place}>
                      {place}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Text */}
            <div className="space-y-3">
              <Label>Custom Text (Optional)</Label>
              <Input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter text to be printed"
              />
            </div>
          </div>

          {/* Artwork Upload & Pricing */}
          <div className="space-y-6">
            {/* File Upload */}
            <div className="space-y-3">
              <Label>Artwork Upload</Label>
              <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Upload Your Design Files
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  JPG, PNG, PDF, AI, EPS files up to 5MB each
                </p>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,.ai,.eps"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Choose Files
                  </label>
                </Button>
              </div>

              {/* Uploaded Files */}
              {artworkFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Files</Label>
                  {artworkFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special Instructions */}
            <div className="space-y-3">
              <Label>Special Instructions</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requirements or notes..."
                className="min-h-[100px]"
              />
            </div>

            {/* Pricing Summary */}
            <div className="bg-card-secondary rounded-lg p-6">
              <h3 className="font-medium text-foreground mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span>{selectedProduct ? products[selectedProduct as keyof typeof products].name : 'None selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span>{quantity} pieces</span>
                </div>
                <div className="flex justify-between">
                  <span>Colors:</span>
                  <span>{selectedColors.length} selected</span>
                </div>
                <div className="flex justify-between">
                  <span>Sizes:</span>
                  <span>{selectedSizes.length} selected</span>
                </div>
              </div>
              
              <div className="border-t border-primary/10 pt-4 mt-4">
                <div className="flex justify-between text-lg font-medium">
                  <span>Total:</span>
                  <span>${price.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ${(price / quantity).toFixed(2)} per piece
                </div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                💡 40% deposit required • 60% before shipping
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {user ? (
                <Button 
                  onClick={handleCreateOrder}
                  disabled={!isFormValid}
                  className="w-full"
                  size="lg"
                >
                  Request Quote
                </Button>
              ) : (
                <AuthDialog 
                  trigger={
                    <Button className="w-full" size="lg">
                      Sign In to Continue
                    </Button>
                  }
                  defaultTab="signup"
                />
              )}
              
              <Button variant="outline" className="w-full">
                Save as Draft
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductCustomizer