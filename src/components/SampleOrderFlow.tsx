import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuthStore, useOrderStore } from "@/lib/store";
import { Package, Truck, Clock, CheckCircle, Star, Loader2, CreditCard } from "lucide-react";
import toast from 'react-hot-toast';
import AuthDialog from './AuthDialog';

const SampleOrderFlow = () => {
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

  const { user } = useAuthStore();
  const { addSampleOrder } = useOrderStore();

  const sampleProducts = [
    {
      id: "t-shirt-cotton",
      name: "Classic Cotton T-Shirt",
      price: 8.99,
      description: "100% cotton, standard fit",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=300&auto=format&fit=crop",
      leadTime: "2-3 days"
    },
    {
      id: "hoodie-premium", 
      name: "Premium Hoodie",
      price: 15.99,
      description: "Cotton blend, fleece-lined",
      image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=300&auto=format&fit=crop",
      leadTime: "3-4 days"
    },
    {
      id: "polo-performance",
      name: "Performance Polo",
      price: 12.99,
      description: "Moisture-wicking fabric",
      image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=300&auto=format&fit=crop",
      leadTime: "2-3 days"
    },
    {
      id: "sweatshirt-crew",
      name: "Crew Sweatshirt", 
      price: 13.99,
      description: "Cotton fleece, relaxed fit",
      image: "https://images.unsplash.com/photo-1548804915-9c7b41b4a2d0?q=80&w=300&auto=format&fit=crop",
      leadTime: "3-4 days"
    }
  ];

  const toggleSample = (sampleId: string) => {
    setSelectedSamples(prev => 
      prev.includes(sampleId) 
        ? prev.filter(id => id !== sampleId)
        : [...prev, sampleId]
    );
  };

  const selectedTotal = selectedSamples.reduce((total, sampleId) => {
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

    if (selectedSamples.length === 0) {
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
        products: selectedSamples.map(id => {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero-secondary" size="lg" className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          Order Samples
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Product Samples</DialogTitle>
          <DialogDescription>
            Get physical samples before placing your bulk order. Shipping takes 2-4 business days.
          </DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sample Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">
                Select Samples
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {sampleProducts.map((sample) => (
                  <div
                    key={sample.id}
                    className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                      selectedSamples.includes(sample.id)
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-primary/10 hover:border-primary/30"
                    }`}
                    onClick={() => toggleSample(sample.id)}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden mb-3">
                      <img
                        src={sample.image}
                        alt={sample.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <h4 className="font-medium text-foreground mb-1">
                      {sample.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {sample.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-medium text-foreground">
                        ${sample.price}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {sample.leadTime}
                      </Badge>
                    </div>
                    
                    {selectedSamples.includes(sample.id) && (
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
            {selectedSamples.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">
                  Shipping Address
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      value={shippingAddress.name}
                      onChange={(e) => handleAddressChange('name', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={shippingAddress.company}
                      onChange={(e) => handleAddressChange('company', e.target.value)}
                      placeholder="Company Name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input
                    value={shippingAddress.address}
                    onChange={(e) => handleAddressChange('address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input
                      value={shippingAddress.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Input
                      value={shippingAddress.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      placeholder="CA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP Code *</Label>
                    <Input
                      value={shippingAddress.zip}
                      onChange={(e) => handleAddressChange('zip', e.target.value)}
                      placeholder="90210"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card-secondary rounded-xl p-6 sticky top-0">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Order Summary
              </h3>
              
              {selectedSamples.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Select samples to continue
                </p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {selectedSamples.map((sampleId) => {
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
                      <span className="text-sm">
                        {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-medium">
                      <span>Total</span>
                      <span>${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {shippingCost === 0 && (
                    <div className="bg-success/10 border border-success/20 rounded-lg p-3 mb-4">
                      <p className="text-xs text-success font-medium">
                        🎉 Free shipping on orders over $50!
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {user ? (
                      <Button 
                        onClick={handlePlaceOrder}
                        disabled={loading || selectedSamples.length === 0}
                        className="w-full"
                        size="lg"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Placing Order...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Place Sample Order
                          </>
                        )}
                      </Button>
                    ) : (
                      <AuthDialog 
                        trigger={
                          <Button className="w-full" size="lg">
                            Sign In to Order
                          </Button>
                        }
                        defaultTab="signup"
                      />
                    )}
                  </div>
                  
                  <div className="bg-coral/10 border border-coral/20 rounded-lg p-3 mt-4">
                    <p className="text-xs text-foreground">
                      💡 <strong>Sample Credits:</strong> Cost applied toward bulk orders placed within 30 days
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SampleOrderFlow;