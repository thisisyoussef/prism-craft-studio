import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Upload, Camera, Clock, CheckCircle, AlertCircle, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { OrderService } from '@/lib/services/orderService';
import { useToast } from '@/hooks/use-toast';
import type { Order, ProductionUpdate, OrderStatus, CreateProductionUpdatePayload } from '@/lib/types/order';

interface ProductionTrackerProps {
  order: Order;
  onUpdate?: () => void;
}

const productionStages: { stage: OrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { stage: 'deposit_paid', label: 'Design Review', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800' },
  { stage: 'in_production', label: 'In Production', icon: <Clock className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { stage: 'quality_check', label: 'Quality Check', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800' },
  { stage: 'balance_pending', label: 'Ready for Balance', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-orange-100 text-orange-800' },
  { stage: 'ready_to_ship', label: 'Ready to Ship', icon: <Truck className="w-4 h-4" />, color: 'bg-green-100 text-green-800' },
  { stage: 'shipped', label: 'Shipped', icon: <Truck className="w-4 h-4" />, color: 'bg-green-100 text-green-800' },
  { stage: 'delivered', label: 'Delivered', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 text-green-800' },
];

export function ProductionTracker({ order, onUpdate }: ProductionTrackerProps) {
  const [updates, setUpdates] = useState<ProductionUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [newUpdate, setNewUpdate] = useState<Partial<CreateProductionUpdatePayload>>({
    stage: order.status,
    status: 'updated',
    visible_to_customer: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadProductionUpdates();
  }, [order.id]);

  const loadProductionUpdates = async () => {
    try {
      setLoading(true);
      const orderService = new OrderService();
      const productionUpdates = await orderService.getProductionUpdates(order.id);
      setUpdates(productionUpdates);
    } catch (error) {
      console.error('Failed to load production updates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load production updates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.description?.trim()) {
      toast({
        title: 'Error',
        description: 'Please add a description for the update',
        variant: 'destructive'
      });
      return;
    }

    try {
      const orderService = new OrderService();
      await orderService.createProductionUpdate({
        order_id: order.id,
        stage: newUpdate.stage!,
        status: newUpdate.status!,
        description: newUpdate.description,
        visible_to_customer: newUpdate.visible_to_customer || false,
        photos: newUpdate.photos || null
      });

      setShowAddUpdate(false);
      setNewUpdate({
        stage: order.status,
        status: 'updated',
        visible_to_customer: true
      });
      
      await loadProductionUpdates();
      onUpdate?.();
      
      toast({
        title: 'Success',
        description: 'Production update added successfully'
      });
    } catch (error) {
      console.error('Failed to add production update:', error);
      toast({
        title: 'Error',
        description: 'Failed to add production update',
        variant: 'destructive'
      });
    }
  };

  const getStageInfo = (stage: OrderStatus) => {
    return productionStages.find(s => s.stage === stage) || {
      stage,
      label: stage.replace(/_/g, ' '),
      icon: <Clock className="w-4 h-4" />,
      color: 'bg-gray-100 text-gray-800'
    };
  };

  const getCurrentStageIndex = () => {
    return productionStages.findIndex(s => s.stage === order.status);
  };

  return (
    <div className="space-y-6">
      {/* Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Production Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productionStages.map((stage, index) => {
              const isCompleted = getCurrentStageIndex() > index;
              const isCurrent = order.status === stage.stage;
              const isPending = getCurrentStageIndex() < index;

              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : stage.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                      {stage.label}
                    </div>
                    {isCurrent && (
                      <div className="text-sm text-muted-foreground">Current stage</div>
                    )}
                  </div>
                  {isCurrent && (
                    <Badge className={stage.color}>Active</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Production Updates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Production Updates</CardTitle>
          <Button onClick={() => setShowAddUpdate(true)} size="sm">
            Add Update
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading updates...</div>
          ) : updates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No production updates yet</div>
          ) : (
            <div className="space-y-4">
              {updates.map((update) => {
                const stageInfo = getStageInfo(update.stage);
                return (
                  <div key={update.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {stageInfo.icon}
                        <Badge className={stageInfo.color}>
                          {stageInfo.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(update.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {update.visible_to_customer && (
                          <Badge variant="outline" className="text-xs">
                            Customer Visible
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {update.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {update.description && (
                      <p className="text-sm mb-3">{update.description}</p>
                    )}
                    
                    {update.photos && update.photos.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {update.photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Production update ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Update Dialog */}
      <Dialog open={showAddUpdate} onOpenChange={setShowAddUpdate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Production Update</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Stage</label>
              <Select 
                value={newUpdate.stage} 
                onValueChange={(value) => setNewUpdate(prev => ({ ...prev, stage: value as OrderStatus }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {productionStages.map((stage) => (
                    <SelectItem key={stage.stage} value={stage.stage}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select 
                value={newUpdate.status} 
                onValueChange={(value) => setNewUpdate(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="started">Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={newUpdate.description || ''}
                onChange={(e) => setNewUpdate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the production update..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="visible-to-customer"
                checked={newUpdate.visible_to_customer}
                onChange={(e) => setNewUpdate(prev => ({ ...prev, visible_to_customer: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="visible-to-customer" className="text-sm">
                Visible to customer
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUpdate(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUpdate}>
              Add Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
