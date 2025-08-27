import { useMemo, useState } from "react";
import { z } from "zod";
import { zodErrorMessage } from "@/lib/errors";
// Removed GarmentMockup SVGs in favor of local images
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuthStore, useOrderStore, useGuestStore } from "@/lib/store";
import { Package, Truck, Clock, CheckCircle, Star, Loader2, CreditCard } from "lucide-react";
import toast from 'react-hot-toast';
import AuthDialog from './AuthDialog';
import GuestDetailsDialog from './GuestDetailsDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sendGuestDraftEmail } from '@/lib/email';

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  base_price: number | null;
  image_url: string | null;
};

type VariantRow = {
  id: string;
  product_id: string;
  color_name: string;
  color_hex: string | null;
  active: boolean | null;
  image_url?: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  sleeve_image_url?: string | null;
};

type SampleOrderFlowProps = {
  mode?: 'dialog' | 'inline';
  selectedSamples?: string[];
  hideSelection?: boolean;
  className?: string;
};

const SampleOrderFlow = ({ mode = 'dialog', selectedSamples: selectedSamplesProp, hideSelection = false, className }: SampleOrderFlowProps) => {
  const [open, setOpen] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  });
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { user } = useAuthStore();
  const { addSampleOrder } = useOrderStore();
  const { info } = useGuestStore();

  const { data: productsData } = useQuery<ProductRow[]>({
    queryKey: ['sample-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, base_price, image_url, customization_options')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Filter only active products
      const activeProducts = (data || []).filter(p => {
        const opts = p.customization_options as any;
        return opts?.active === true || opts?.active === 'true';
      });
      return activeProducts;
    },
  });

  // Fetch variants for these products to derive a preferred front image per product
  const { data: variantsData } = useQuery<VariantRow[]>({
    enabled: !!productsData && productsData.length > 0,
    queryKey: ['sample-variants', (productsData || []).map(p => p.id).join(',')],
    queryFn: async () => {
      const ids = (productsData || []).map(p => p.id);
      if (ids.length === 0) return [] as VariantRow[];
      const { data, error } = await (supabase as any)
        .from('product_variants')
        .select('id, product_id, color_name, color_hex, active, image_url, front_image_url, back_image_url, sleeve_image_url')
        .in('product_id', ids);
      if (error) throw error;
      return (data as unknown as VariantRow[]) || [];
    },
  });

  // Map product_id -> first available best image preferring front, then image, then back/sleeve
  const coverByProduct = useMemo(() => {
    const map = new Map<string, string | null>();
    const list = variantsData || [];
    for (const v of list) {
      if (v.active === false) continue;
      const best = v.front_image_url || v.image_url || v.back_image_url || v.sleeve_image_url || null;
      if (!best || best === '/placeholder.svg') continue; // Skip placeholder images
      if (!map.has(v.product_id)) map.set(v.product_id, best);
    }
    return map;
  }, [variantsData]);

  const sampleProducts = useMemo(() =>
    (productsData || []).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.base_price || 0),
      description: p.description || 'Premium materials, quality prints',
      image: coverByProduct.get(p.id) || (p.image_url !== '/placeholder.svg' ? p.image_url : '') || '',
      leadTime: '2-4 days',
    })),
  [productsData, coverByProduct]);

  const effectiveSelected = selectedSamplesProp ?? selectedSamples;

  const toggleSample = (sampleId: string) => {
    // Disable internal toggling when external selection is provided
    if (selectedSamplesProp) return;
    setSelectedSamples(prev =>
      prev.includes(sampleId)
        ? prev.filter(id => id !== sampleId)
        : [...prev, sampleId]
    );
  };

  const selectedTotal = effectiveSelected.reduce((total, sampleId) => {
    const sample = sampleProducts.find(p => p.id === sampleId);
    return total + (sample?.price || 0);
  }, 0);

  const shippingCost = selectedTotal > 50 ? 0 : 9.99;
  const grandTotal = selectedTotal + shippingCost;

  const handleAddressChange = (field: string, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Please sign in to place an order');
      return;
    }

    if (effectiveSelected.length === 0) {
      toast.error('Please select at least one sample');
      return;
    }

    if (!shippingAddress.name || !shippingAddress.address || !shippingAddress.city) {
      toast.error('Please complete shipping address');
      return;
    }

    setLoading(true);
    try {
      const sampleData = {
        company_id: user.id,
        user_id: user.id,
        products: effectiveSelected.map(id => {
          const product = sampleProducts.find(p => p.id === id);
          return {
            id,
            name: product?.name,
            price: product?.price,
            leadTime: product?.leadTime
          };
        }),
        total_price: grandTotal,
        status: 'ordered',
        shipping_address: shippingAddress
      };

      await addSampleOrder(sampleData);
      toast.success('Sample order placed successfully!');
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to place sample order');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSamples([]);
    setShippingAddress({
      name: '',
      company: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    });
  };

  // Build left selection section (only when not hiding selection)
  const LeftSection = (
    <div className="lg:col-span-2 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Select samples</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {sampleProducts.map((sample) => (
            <div
              key={sample.id}
              className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                effectiveSelected.includes(sample.id)
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                  : 'border-primary/10 hover:border-primary/30'
              }`}
              onClick={() => toggleSample(sample.id)}
            >
              <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-background">
                {sample.image ? (
                  <img src={sample.image} alt={sample.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">No image</div>
                )}
              </div>
              <h4 className="font-medium text-foreground mb-1">{sample.name}</h4>
              <p className="text-sm text-muted-foreground mb-2">{sample.description}</p>
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium text-foreground">${sample.price}</div>
                <Badge variant="outline" className="text-xs">{sample.leadTime}</Badge>
              </div>
              {effectiveSelected.includes(sample.id) && (
                <div className="mt-2 flex items-center gap-2 text-primary">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address */}
      {effectiveSelected.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Shipping Address</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={shippingAddress.name} onChange={(e) => handleAddressChange('name', e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={shippingAddress.company} onChange={(e) => handleAddressChange('company', e.target.value)} placeholder="Company Name" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address *</Label>
            <Input value={shippingAddress.address} onChange={(e) => handleAddressChange('address', e.target.value)} placeholder="123 Main Street" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={shippingAddress.city} onChange={(e) => handleAddressChange('city', e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input value={shippingAddress.state} onChange={(e) => handleAddressChange('state', e.target.value)} placeholder="CA" />
            </div>
            <div className="space-y-2">
              <Label>ZIP Code *</Label>
              <Input value={shippingAddress.zip} onChange={(e) => handleAddressChange('zip', e.target.value)} placeholder="90210" />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Build right summary/address section (used in both modes)
  const RightSection = (
    <div className="lg:col-span-1">
      {/* In inline mode, show shipping address form here when samples are selected */}
      {hideSelection && effectiveSelected.length > 0 && (
        <div className="bg-card-secondary rounded-xl p-6 mb-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Shipping address</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={shippingAddress.name} onChange={(e) => handleAddressChange('name', e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={shippingAddress.company} onChange={(e) => handleAddressChange('company', e.target.value)} placeholder="Company Name" />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label>Address *</Label>
            <Input value={shippingAddress.address} onChange={(e) => handleAddressChange('address', e.target.value)} placeholder="123 Main Street" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={shippingAddress.city} onChange={(e) => handleAddressChange('city', e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input value={shippingAddress.state} onChange={(e) => handleAddressChange('state', e.target.value)} placeholder="CA" />
            </div>
            <div className="space-y-2">
              <Label>ZIP Code *</Label>
              <Input value={shippingAddress.zip} onChange={(e) => handleAddressChange('zip', e.target.value)} placeholder="90210" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-card-secondary rounded-xl p-6 sticky top-0">
        <h3 className="text-lg font-medium text-foreground mb-4">Order summary</h3>
        {effectiveSelected.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Select samples to continue</p>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {effectiveSelected.map((sampleId) => {
                const sample = sampleProducts.find(p => p.id === sampleId);
                return sample ? (
                  <div key={sampleId} className="flex justify-between items-center">
                    <span className="text-sm text-foreground">{sample.name}</span>
                    <span className="text-sm font-medium">${sample.price}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="space-y-2 border-t border-primary/10 pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm">Subtotal</span>
                <span className="text-sm">${selectedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Shipping</span>
                <span className="text-sm">{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
            {shippingCost === 0 && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3 mb-4">
                <p className="text-xs text-success font-medium">🎉 Free shipping on orders over $50!</p>
              </div>
            )}
            <div className="space-y-3">
              {user ? (
                <Button onClick={handlePlaceOrder} disabled={loading || effectiveSelected.length === 0} className="w-full" size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Place order
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <GuestDetailsDialog
                    trigger={<Button className="w-full" size="lg">Order as guest</Button>}
                    title="Order as Guest"
                    description="Enter your details to place a sample order as a guest. We'll email your order receipt and tracking updates."
                    onSubmitted={async () => {
                      const guestSampleSchema = z.object({
                        selectedSamples: z.array(z.string()).min(1, 'Select at least one sample'),
                        address: z.object({
                          name: z.string().min(1, 'Full name is required'),
                          address: z.string().min(1, 'Address is required'),
                          city: z.string().min(1, 'City is required'),
                          state: z.string().min(1, 'State is required'),
                          zip: z.string().min(1, 'ZIP code is required'),
                          country: z.string().min(1, 'Country is required'),
                          company: z.string().optional(),
                        })
                      })
                      const parsed = guestSampleSchema.safeParse({ selectedSamples: effectiveSelected, address: shippingAddress })
                      if (!parsed.success) {
                        toast.error(zodErrorMessage(parsed.error))
                        return
                      }
                      try {
                        const items = effectiveSelected.map((id) => {
                          const p = sampleProducts.find(sp => sp.id === id)
                          return { id, name: p?.name, price: p?.price }
                        })
                        const payload = {
                          type: 'sample',
                          info: info || {},
                          address: shippingAddress,
                          draft: { items },
                          totals: { subtotal: selectedTotal, shipping: shippingCost, total: grandTotal },
                          pricing: { selectedSamples: effectiveSelected, shippingAddress },
                        }
                        const { error } = await (supabase as any).from('guest_drafts').insert(payload as any)
                        if (error) throw error
                        await sendGuestDraftEmail('sample', info?.email, payload)
                        toast.success('Guest sample order saved. We\'ll follow up via email.')
                        setOpen(false)
                        setConfirmOpen(true)
                      } catch (e: any) {
                        console.error(e)
                        toast.error(e?.message || 'Failed to save guest sample')
                      }
                    }}
                  />
                  <AuthDialog 
                    trigger={<Button variant="outline" className="w-full" size="lg">Sign in to order</Button>}
                    defaultTab="signup"
                  />
                </>
              )}
            </div>
            <div className="bg-coral/10 border border-coral/20 rounded-lg p-3 mt-4">
              <p className="text-xs text-foreground"> Sample Credits: Cost applied toward bulk orders placed within 30 days</p>
              <p className="text-xs text-foreground">💡 <strong>Sample Credits:</strong> Cost applied toward bulk orders placed within 30 days</p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Compose inner content depending on selection visibility
  const InnerContent = hideSelection ? (
    <div className={className}>{RightSection}</div>
  ) : (
    <div className={className}>
      <div className="grid lg:grid-cols-3 gap-8">
        {LeftSection}
        {RightSection}
      </div>
    </div>
  );

  return (
    <>
      {mode === 'dialog' ? (
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero-secondary" size="lg" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                See & feel samples
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Order samples</DialogTitle>
                <DialogDescription>
                  Get physical samples before bulk orders. 2-4 day shipping.
                </DialogDescription>
              </DialogHeader>
              {InnerContent}
            </DialogContent>
          </Dialog>
          {/* Confirmation CTA to create account */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Sample Request Saved</DialogTitle>
                <DialogDescription>
                  We saved your request and will follow up by email. Create an account to track status and manage orders.
                </DialogDescription>
              </DialogHeader>
              <AuthDialog trigger={<Button className="w-full">Create Account to Track</Button>} defaultTab="signup" />
              <Button variant="outline" className="w-full" onClick={() => setConfirmOpen(false)}>Close</Button>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          {InnerContent}
          {/* Keep confirmation dialog for inline mode */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Sample Request Saved</DialogTitle>
                <DialogDescription>
                  We saved your request and will follow up by email. Create an account to track status and manage orders.
                </DialogDescription>
              </DialogHeader>
              <AuthDialog trigger={<Button className="w-full">Create Account to Track</Button>} defaultTab="signup" />
              <Button variant="outline" className="w-full" onClick={() => setConfirmOpen(false)}>Close</Button>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}

export default SampleOrderFlow;