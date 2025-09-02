import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore, useOrderStore, usePricingStore, useGuestStore } from '@/lib/store'
import { Calculator, ArrowLeft, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthDialog from './AuthDialog'
import GuestDetailsDialog from './GuestDetailsDialog'
import { supabase } from '@/lib/supabase'
import { customizerSchema, type CustomizerInput } from '@/lib/validation'
import { zodErrorMessage } from '@/lib/errors'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sendGuestDraftEmail } from '../lib/email'
import { useNavigate } from 'react-router-dom'

interface CustomizerStep2Props {
  onBack: () => void
  selectedProduct: string
}

const CustomizerStep2 = ({ onBack, selectedProduct }: CustomizerStep2Props) => {
  const navigate = useNavigate()
  const [sizesQty, setSizesQty] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { user } = useAuthStore()
  const { addOrder } = useOrderStore()
  const { quantity, price, priceBreakdown, prints, updateQuantity } = usePricingStore()
  const { info, address } = useGuestStore()

  // Simplified size options
  const commonSizes = ['S', 'M', 'L', 'XL', 'XXL']
  
  // Load product info
  const [productInfo, setProductInfo] = useState<{ name: string; basePrice: number } | null>(null)
  
  useEffect(() => {
    if (!selectedProduct) return
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('products')
          .select('name, base_price')
          .eq('id', selectedProduct)
          .maybeSingle()
        if (!error && data) {
          setProductInfo({ name: data.name, basePrice: data.base_price ?? 0 })
        }
      } catch {}
    })()
  }, [selectedProduct])

  // Initialize with minimum quantities
  useEffect(() => {
    const hasAny = Object.values(sizesQty).some(v => (v || 0) > 0)
    if (!hasAny) {
      // Start with a simple distribution: 10 each for S-XL = 50 minimum
      const initial: Record<string, number> = {}
      commonSizes.forEach(size => {
        initial[size] = size === 'S' || size === 'M' || size === 'L' || size === 'XL' ? 10 : 5
      })
      setSizesQty(initial)
      updateQuantity(50) // Total from above
    }
  }, [sizesQty, updateQuantity])

  // Form validation
  const form = useForm<CustomizerInput>({
    resolver: zodResolver(customizerSchema),
    mode: 'onChange',
    defaultValues: {
      productId: selectedProduct,
      sizesQty,
      prints,
    },
  })
  const { setValue, formState } = form

  // Update form when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      setValue('productId', selectedProduct, { shouldValidate: true })
    }
  }, [selectedProduct, setValue])

  // Keep form in sync
  useEffect(() => {
    setValue('sizesQty', sizesQty, { shouldValidate: true })
  }, [sizesQty, setValue])

  const updateSizeQty = (size: string, qty: number) => {
    setSizesQty(prev => {
      const next = { ...prev, [size]: Math.max(0, qty) }
      return next
    })
  }

  // Update total quantity when sizesQty changes
  useEffect(() => {
    const total = Object.values(sizesQty).reduce((a, b) => a + (b || 0), 0)
    updateQuantity(Math.max(50, total))
  }, [sizesQty, updateQuantity])

  const setTotalQuantity = (newTotal: number) => {
    const total = Math.max(50, Math.floor(newTotal || 0))
    const currentTotal = Object.values(sizesQty).reduce((a, b) => a + (b || 0), 0)
    
    if (currentTotal === 0) {
      // Distribute evenly
      const perSize = Math.floor(total / commonSizes.length)
      const remainder = total % commonSizes.length
      const next: Record<string, number> = {}
      commonSizes.forEach((size, i) => {
        next[size] = perSize + (i < remainder ? 1 : 0)
      })
      setSizesQty(next)
    } else {
      // Scale proportionally
      const scale = total / currentTotal
      const next: Record<string, number> = {}
      let allocated = 0
      commonSizes.forEach((size, i) => {
        if (i === commonSizes.length - 1) {
          next[size] = Math.max(0, total - allocated)
        } else {
          const scaled = Math.floor((sizesQty[size] || 0) * scale)
          next[size] = scaled
          allocated += scaled
        }
      })
      setSizesQty(next)
    }
    updateQuantity(total)
  }

  const totalQuantity = Object.values(sizesQty).reduce((a, b) => a + (b || 0), 0)
  const unitPrice = totalQuantity > 0 ? price / totalQuantity : 0

  const handleCreateOrder = async () => {
    if (!user) {
      toast.error('Please sign in to create an order')
      return
    }

    setIsSubmitting(true)
    try {
      // Validate
      setValue('productId', selectedProduct)
      setValue('sizesQty', sizesQty)
      setValue('prints', prints)
      const valid = await form.trigger()
      
      if (!valid) {
        const errs = formState.errors
        console.log('Validation errors:', errs)
        
        // Build specific error messages
        const errorMessages: string[] = []
        
        if (errs.productId?.message) {
          errorMessages.push(`Product: ${errs.productId.message}`)
        }
        
        if (errs.sizesQty?.message) {
          errorMessages.push(`Quantities: ${errs.sizesQty.message}`)
        }
        
        if (errs.prints?.message) {
          errorMessages.push(`Print locations: ${errs.prints.message}`)
        }
        
        // Check for specific validation issues
        const totalQty = Object.values(sizesQty).reduce((sum, qty) => sum + (qty || 0), 0)
        if (totalQty < 50) {
          errorMessages.push(`Minimum order is 50 pieces (current: ${totalQty})`)
        }
        
        if (prints.length === 0) {
          errorMessages.push('Add at least one print placement')
        }
        
        if (!selectedProduct) {
          errorMessages.push('Select a product')
        }
        
        const message = errorMessages.length > 0 
          ? errorMessages.join('\n') 
          : 'Please check your order details and try again'
          
        toast.error(message)
        return
      }

      const orderPayload = {
        product_id: selectedProduct,
        product_name: productInfo?.name || 'Product',
        product_category: 'apparel',
        quantity: totalQuantity,
        unit_price: unitPrice,
        total_amount: price,
        customization: {
          baseColor: 'default',
          printLocations: prints.map(p => ({
            id: p.id,
            location: p.location as any,
            method: p.method as any,
            colors: p.colors || [],
            colorCount: p.colorCount || 1,
            size: p.size,
            position: p.position,
            rotationDeg: p.rotationDeg,
            customText: p.customText,
            notes: p.notes,
          })),
          method: prints[0]?.method || 'screen-print',
          specialInstructions: notes,
        },
        colors: [],
        sizes: sizesQty,
        print_locations: prints.map(p => ({
          id: p.id,
          location: p.location as any,
          method: p.method as any,
          colors: p.colors || [],
          colorCount: p.colorCount || 1,
          size: p.size,
          position: p.position,
          rotationDeg: p.rotationDeg,
          customText: p.customText,
          notes: p.notes,
        })),
        customer_notes: notes,
      }

      const created = await addOrder(orderPayload)
      toast.success('Order created successfully!')
      
      if (created?.id) {
        navigate(`/orders/${created.id}`)
      }
    } catch (error: unknown) {
      console.error('Order creation error:', error)
      const message = error instanceof Error ? error.message : 'Failed to create order'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuestOrder = async () => {
    const validation = customizerSchema.safeParse({
      productId: selectedProduct,
      sizesQty,
      prints,
    })
    
    if (!validation.success) {
      toast.error(zodErrorMessage(validation.error))
      return
    }

    try {
      const payload = {
        type: 'quote',
        info: info || {},
        address: address || {},
        draft: {
          product_type: selectedProduct,
          sizes: sizesQty,
          customization_prints: prints.map(p => ({
            id: p.id,
            location: p.location,
            method: p.method,
            colors: p.colors,
            colorCount: p.colorCount,
            size: p.size,
            position: p.position,
            rotationDeg: p.rotationDeg,
            customText: p.customText,
            notes: p.notes
          })),
          notes,
          quantity: totalQuantity,
        },
        totals: { total: price },
        pricing: {
          quantity: totalQuantity,
          unit_price: unitPrice,
          total: price
        },
      }

      const { error } = await supabase.from('guest_drafts').insert(payload)
      if (error) throw error

      await sendGuestDraftEmail('quote', info?.email, payload)
      toast.success('Quote request saved. We\'ll email you shortly.')
    } catch (e: unknown) {
      console.error(e)
      const message = e instanceof Error ? e.message : 'Failed to save quote request'
      toast.error(message)
    }
  }

  const isFormValid = useMemo(() => {
    return totalQuantity >= 50 && prints.length > 0
  }, [totalQuantity, prints])

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-medium text-foreground mb-2">Order details</h1>
        <p className="text-muted-foreground">Set quantities and review your order</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Quantities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <span>Product:</span>
                <span className="font-medium text-right break-words">{productInfo?.name || 'Loading...'}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span>Print locations:</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {prints.map(p => (
                    <Badge key={p.id} variant="outline" className="text-xs">{p.location}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simplified Quantity Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quantities by size</CardTitle>
              <p className="text-sm text-muted-foreground">Minimum order: 50 pieces</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total Quantity Input */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-muted/50 rounded-lg">
                <Label className="font-medium">Total quantity (minimum 50):</Label>
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start w-full sm:w-auto">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setTotalQuantity(totalQuantity - 5)}
                    disabled={totalQuantity <= 50}
                  >
                    -5
                  </Button>
                  <Input
                    type="number"
                    min={50}
                    value={totalQuantity}
                    onChange={(e) => setTotalQuantity(parseInt(e.target.value || '50'))}
                    className="w-20 text-center"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setTotalQuantity(totalQuantity + 5)}
                  >
                    +5
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setTotalQuantity(totalQuantity + 25)}
                  >
                    +25
                  </Button>
                </div>
              </div>

              {/* Size Distribution */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {commonSizes.map(size => (
                  <div key={size} className="text-center">
                    <Label className="text-sm font-medium">{size}</Label>
                    <div className="flex items-center mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => updateSizeQty(size, (sizesQty[size] || 0) - 1)}
                        disabled={(sizesQty[size] || 0) <= 0}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={sizesQty[size] || 0}
                        onChange={(e) => updateSizeQty(size, parseInt(e.target.value || '0'))}
                        className="h-8 w-16 text-center mx-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => updateSizeQty(size, (sizesQty[size] || 0) + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {totalQuantity < 50 && (
                <div className="text-sm text-destructive">
                  Minimum order quantity is 50 pieces. Current: {totalQuantity}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Special instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requirements or notes for your order..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Cost Summary & Checkout */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Cost breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span>Base price:</span>
                  <span>${productInfo?.basePrice?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Quantity:</span>
                  <span>{totalQuantity} pieces</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Print setup:</span>
                  <span>Included</span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between gap-2 text-lg font-semibold">
                  <span>Total:</span>
                  <span>${price.toFixed(2)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  ${unitPrice.toFixed(2)} per piece
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                💡 40% deposit required • 60% due before shipping
              </div>
            </CardContent>
          </Card>

          {/* Checkout Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              {user ? (
                <Button 
                  onClick={handleCreateOrder} 
                  className="w-full" 
                  size="lg"
                  disabled={!isFormValid || isSubmitting}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Creating order...' : 'Create order'}
                </Button>
              ) : (
                <>
                  <GuestDetailsDialog
                    trigger={
                      <Button 
                        className="w-full" 
                        size="lg"
                        disabled={!isFormValid}
                      >
                        Get quote as guest
                      </Button>
                    }
                    title="Get your quote"
                    description="We'll email you a detailed quote. No account required."
                    onSubmitted={handleGuestOrder}
                  />
                  <AuthDialog 
                    trigger={
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        size="lg"
                        disabled={!isFormValid}
                      >
                        Sign in to order
                      </Button>
                    } 
                    defaultTab="signup"
                  />
                </>
              )}
              <Button variant="outline" className="w-full">
                Save as draft
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to design
        </Button>
        <div className="text-sm text-muted-foreground">
          Step 2 of 2
        </div>
      </div>
    </div>
  )
}

export default CustomizerStep2
