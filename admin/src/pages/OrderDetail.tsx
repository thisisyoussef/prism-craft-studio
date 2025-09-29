import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getSocket, joinOrderRoom } from '../lib/socket';

// Types
type Order = {
  id: string;
  orderNumber: string;
  productCategory?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  customization?: Record<string, any>;
  colors?: string[];
  sizes?: Record<string, number>;
  printLocations?: string[];
  status: 'submitted' | 'paid' | 'in_production' | 'shipping' | 'delivered';
  totalPaidAmount?: number;
  paidAt?: string;
  customerEmail?: string;
  customerName?: string;
  companyName?: string;
  shippingAddress?: any;
  trackingNumber?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdAt?: string;
  updatedAt?: string;
};

type TimelineEvent = {
  id: string;
  orderId: string;
  eventType: string;
  description: string;
  eventData?: Record<string, any>;
  triggerSource?: string;
  createdAt: string;
};

type ProductionUpdate = {
  id: string;
  orderId: string;
  stage: string;
  status: string;
  description?: string;
  photos?: string[];
  documents?: string[];
  createdAt: string;
};

type FileItem = {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  filePurpose: string;
  uploadedAt: string;
};

type Payment = {
  id: string;
  orderId: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  paidAt?: string;
  createdAt?: string;
};

const statusOptions: Order['status'][] = ['submitted', 'paid', 'in_production', 'shipping', 'delivered'];
const filePurposes = ['artwork','tech_pack','reference','proof','final_design','production_update','mockup'] as const;

type Tab = 'overview' | 'timeline' | 'production' | 'files' | 'payments' | 'email';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const qc = useQueryClient();

  // Data queries
  const orderQ = useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const timelineQ = useQuery({
    queryKey: ['orders', id, 'timeline'],
    queryFn: async () => {
      const res = await api.get<TimelineEvent[]>(`/orders/${id}/timeline`);
      return res.data;
    },
    enabled: !!id,
  });

  const prodQ = useQuery({
    queryKey: ['orders', id, 'production'],
    queryFn: async () => {
      const res = await api.get<ProductionUpdate[]>(`/orders/${id}/production-updates`);
      return res.data;
    },
    enabled: !!id,
  });

  const filesQ = useQuery({
    queryKey: ['orders', id, 'files'],
    queryFn: async () => {
      const res = await api.get<FileItem[]>(`/files/order/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const paymentsQ = useQuery({
    queryKey: ['orders', id, 'payments'],
    queryFn: async () => {
      const res = await api.get<Payment[]>(`/orders/${id}/payment`);
      return res.data;
    },
    enabled: !!id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    joinOrderRoom(id);

    const onOrderUpdated = (payload: Order) => {
      qc.setQueryData(['orders', id], payload);
    };
    const onTimelineCreated = (payload: TimelineEvent) => {
      qc.setQueryData<TimelineEvent[] | undefined>(['orders', id, 'timeline'], (old) => [payload, ...(old ?? [])]);
    };
    const onProductionCreated = (payload: ProductionUpdate) => {
      qc.setQueryData<ProductionUpdate[] | undefined>(['orders', id, 'production'], (old) => [payload, ...(old ?? [])]);
    };
    const onFileUploaded = (payload: any) => {
      const item: FileItem = {
        id: payload.id || `${Date.now()}`,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        fileType: payload.fileType,
        fileUrl: payload.fileUrl,
        filePurpose: payload.filePurpose,
        uploadedAt: payload.uploadedAt || new Date().toISOString(),
      };
      qc.setQueryData<FileItem[] | undefined>(['orders', id, 'files'], (old) => [item, ...(old ?? [])]);
    };

    socket.on('order.updated', onOrderUpdated);
    socket.on('order.timeline.created', onTimelineCreated);
    socket.on('order.production.created', onProductionCreated);
    socket.on('order.file.uploaded', onFileUploaded);

    return () => {
      socket.off('order.updated', onOrderUpdated);
      socket.off('order.timeline.created', onTimelineCreated);
      socket.off('order.production.created', onProductionCreated);
      socket.off('order.file.uploaded', onFileUploaded);
    };
  }, [id, qc]);

  // Mutations
  const updateStatus = useMutation({
    mutationFn: async (payload: { status: Order['status']; trackingNumber?: string; estimatedDelivery?: string }) => {
      const res = await api.patch<Order>(`/orders/${id}/status`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['orders', id], data);
    },
  });

  const addTimeline = useMutation({
    mutationFn: async (payload: { eventType: string; description: string }) => {
      const res = await api.post<TimelineEvent>(`/orders/${id}/timeline`, payload);
      return res.data;
    },
    onSuccess: (ev) => {
      qc.setQueryData<TimelineEvent[] | undefined>(['orders', id, 'timeline'], (old) => [ev, ...(old ?? [])]);
    },
  });

  const addProduction = useMutation({
    mutationFn: async (payload: { stage: string; status: string; description?: string }) => {
      const res = await api.post<ProductionUpdate>(`/orders/${id}/production`, payload);
      return res.data;
    },
    onSuccess: (pu) => {
      qc.setQueryData<ProductionUpdate[] | undefined>(['orders', id, 'production'], (old) => [pu, ...(old ?? [])]);
    },
  });

  const uploadFile = useMutation({
    mutationFn: async ({ file, filePurpose }: { file: File; filePurpose: typeof filePurposes[number] }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('orderId', id!);
      fd.append('filePurpose', filePurpose);
      const res = await api.post<{ fileUrl: string }>(`/files/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', id, 'files'] });
    },
  });

  const sendEmail = useMutation({
    mutationFn: async (payload: { to: string; subject: string; text?: string; html?: string }) => {
      const res = await api.post(`/emails/send`, payload);
      return res.data;
    },
  });

  const createCheckout = useMutation({
    mutationFn: async (phase: 'full_payment' | 'shipping_fee') => {
      const res = await api.post<{ id: string; url: string }>(`/payments/create-checkout`, { orderId: id, phase });
      return res.data;
    },
    onSuccess: (s) => {
      if (s.url) window.open(s.url, '_blank');
    },
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ id: string; invoiceUrl: string }>(`/payments/create-invoice`, { orderId: id });
      return res.data;
    },
    onSuccess: (s) => {
      if (s.invoiceUrl) window.open(s.invoiceUrl, '_blank');
    },
  });

  const order = orderQ.data;
  const [tracking, setTracking] = useState<string>('');
  const [eta, setEta] = useState<string>(''); // yyyy-MM-dd
  useEffect(() => {
    if (order) {
      setTracking(order.trackingNumber || '');
      setEta(order.estimatedDelivery ? String(order.estimatedDelivery).slice(0, 10) : '');
    }
  }, [order?.trackingNumber, order?.estimatedDelivery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Order {order?.orderNumber || id}</h1>
          <div className="text-gray-500 text-sm">{order?.customerName} • {order?.customerEmail} • {order?.companyName}</div>
        </div>
        <Link to="/orders" className="text-sm text-brand-700 hover:underline">Back to orders</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['overview','timeline','production','files','payments','email'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab===t ? 'border-brand-600 text-gray-900' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >{t}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-500 mb-2">Status</div>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1"
                  value={order?.status}
                  onChange={(e) => updateStatus.mutate({ status: e.target.value as Order['status'] })}
                >
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {updateStatus.isPending && <span className="text-xs text-gray-500">Updating…</span>}
              </div>
            </div>

            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-500 mb-2">Totals</div>
              <div className="text-sm">Amount: ${order?.totalAmount?.toFixed(2)}</div>
              <div className="text-sm">Paid: ${order?.totalPaidAmount?.toFixed(2) || 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-500 mb-2">Shipping</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tracking Number</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="e.g. 1Z..."
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Estimated Delivery</label>
                  <input
                    type="date"
                    className="border rounded px-3 py-2 text-sm"
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="bg-gray-900 text-white rounded px-3 py-2 text-sm"
                    onClick={() => updateStatus.mutate({ status: order!.status, trackingNumber: tracking || undefined, estimatedDelivery: eta || undefined })}
                    disabled={updateStatus.isPending}
                  >
                    {updateStatus.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    className="bg-white border rounded px-3 py-2 text-sm"
                    onClick={async () => {
                      try {
                        await updateStatus.mutateAsync({ status: order!.status, trackingNumber: tracking || undefined, estimatedDelivery: eta || undefined });
                        await qc.invalidateQueries({ queryKey: ['orders'] });
                        await qc.invalidateQueries({ queryKey: ['orders', id] });
                      } catch {}
                    }}
                    disabled={updateStatus.isPending}
                  >
                    Save & apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {tab === 'timeline' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white border rounded p-4">
            <h2 className="font-medium mb-3">Events</h2>
            <ul className="space-y-3">
              {(timelineQ.data ?? []).map(ev => (
                <li key={ev.id} className="border rounded p-3">
                  <div className="text-sm font-medium">{ev.eventType}</div>
                  <div className="text-sm text-gray-700">{ev.description}</div>
                  <div className="text-xs text-gray-500">{new Date(ev.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border rounded p-4">
            <h3 className="font-medium mb-2">Add event</h3>
            <TimelineForm onSubmit={(payload) => addTimeline.mutate(payload)} pending={addTimeline.isPending} />
          </div>
        </div>
      )}

      {/* Production */}
      {tab === 'production' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white border rounded p-4">
            <h2 className="font-medium mb-3">Updates</h2>
            <ul className="space-y-3">
              {(prodQ.data ?? []).map(pu => (
                <li key={pu.id} className="border rounded p-3">
                  <div className="text-sm font-medium">{pu.stage} — {pu.status}</div>
                  <div className="text-sm text-gray-700">{pu.description}</div>
                  <div className="text-xs text-gray-500">{new Date(pu.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border rounded p-4">
            <h3 className="font-medium mb-2">Add update</h3>
            <ProductionForm onSubmit={(payload) => addProduction.mutate(payload)} pending={addProduction.isPending} />
          </div>
        </div>
      )}

      {/* Files */}
      {tab === 'files' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white border rounded p-4">
            <h2 className="font-medium mb-3">Files</h2>
            <ul className="space-y-2">
              {(filesQ.data ?? []).map(f => (
                <li key={f.id} className="flex items-center justify-between border rounded p-2">
                  <div>
                    <div className="text-sm font-medium">{f.fileName}</div>
                    <div className="text-xs text-gray-500">{f.filePurpose} • {(f.fileSize/1024).toFixed(1)} KB</div>
                  </div>
                  <a href={f.fileUrl} target="_blank" className="text-brand-700 text-sm">Open</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border rounded p-4">
            <h3 className="font-medium mb-2">Upload file</h3>
            <UploadForm onUpload={(file, purpose) => uploadFile.mutate({ file, filePurpose: purpose })} pending={uploadFile.isPending} />
          </div>
        </div>
      )}

      {/* Payments */}
      {tab === 'payments' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white border rounded p-4">
            <h2 className="font-medium mb-3">Payments</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="px-2 py-1">Amount</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {(paymentsQ.data ?? []).map(p => (
                  <tr key={p.id} className="border-b">
                    <td className="px-2 py-1">${(p.amountCents/100).toFixed(2)}</td>
                    <td className="px-2 py-1 capitalize">{p.status}</td>
                    <td className="px-2 py-1">{p.paidAt ? new Date(p.paidAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white border rounded p-4 space-y-2">
            <h3 className="font-medium mb-2">Collect payment</h3>
            <button onClick={() => createCheckout.mutate('full_payment')} className="w-full bg-gray-900 text-white rounded px-3 py-2 text-sm">Create checkout session</button>
            <button onClick={() => createInvoice.mutate()} className="w-full bg-white border rounded px-3 py-2 text-sm">Create invoice</button>
          </div>
        </div>
      )}

      {/* Email */}
      {tab === 'email' && (
        <div className="bg-white border rounded p-4 max-w-xl">
          <h2 className="font-medium mb-3">Send email</h2>
          <EmailForm
            defaultTo={order?.customerEmail || ''}
            onSubmit={(payload) => sendEmail.mutate(payload)}
            pending={sendEmail.isPending}
          />
        </div>
      )}
    </div>
  );
}

function TimelineForm({ onSubmit, pending }: { onSubmit: (p: { eventType: string; description: string }) => void; pending: boolean }) {
  const [eventType, setEventType] = useState('note');
  const [description, setDescription] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ eventType, description }); setDescription(''); }} className="space-y-2">
      <label className="block text-sm">Event type</label>
      <input className="w-full border rounded px-2 py-1" value={eventType} onChange={e=>setEventType(e.target.value)} />
      <label className="block text-sm">Description</label>
      <textarea className="w-full border rounded px-2 py-1" value={description} onChange={e=>setDescription(e.target.value)} rows={3} />
      <button type="submit" disabled={pending} className="bg-gray-900 text-white rounded px-3 py-2 text-sm">{pending ? 'Adding…' : 'Add event'}</button>
    </form>
  );
}

function ProductionForm({ onSubmit, pending }: { onSubmit: (p: { stage: string; status: string; description?: string }) => void; pending: boolean }) {
  const [stage, setStage] = useState('printing');
  const [status, setStatus] = useState('in_progress');
  const [description, setDescription] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ stage, status, description }); setDescription(''); }} className="space-y-2">
      <label className="block text-sm">Stage</label>
      <input className="w-full border rounded px-2 py-1" value={stage} onChange={e=>setStage(e.target.value)} />
      <label className="block text-sm">Status</label>
      <input className="w-full border rounded px-2 py-1" value={status} onChange={e=>setStatus(e.target.value)} />
      <label className="block text-sm">Description</label>
      <textarea className="w-full border rounded px-2 py-1" value={description} onChange={e=>setDescription(e.target.value)} rows={3} />
      <button type="submit" disabled={pending} className="bg-gray-900 text-white rounded px-3 py-2 text-sm">{pending ? 'Adding…' : 'Add update'}</button>
    </form>
  );
}

function UploadForm({ onUpload, pending }: { onUpload: (file: File, purpose: typeof filePurposes[number]) => void; pending: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<typeof filePurposes[number]>('artwork');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (file) onUpload(file, purpose); }} className="space-y-2">
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <select className="border rounded px-2 py-1" value={purpose} onChange={(e)=>setPurpose(e.target.value as any)}>
        {filePurposes.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <button type="submit" disabled={!file || pending} className="bg-gray-900 text-white rounded px-3 py-2 text-sm">{pending ? 'Uploading…' : 'Upload'}</button>
    </form>
  );
}

function EmailForm({ defaultTo, onSubmit, pending }: { defaultTo: string; onSubmit: (p: { to: string; subject: string; text?: string; html?: string }) => void; pending: boolean }) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ to, subject, text }); }} className="space-y-2">
      <label className="block text-sm">To</label>
      <input className="w-full border rounded px-2 py-1" value={to} onChange={e=>setTo(e.target.value)} />
      <label className="block text-sm">Subject</label>
      <input className="w-full border rounded px-2 py-1" value={subject} onChange={e=>setSubject(e.target.value)} />
      <label className="block text-sm">Message</label>
      <textarea className="w-full border rounded px-2 py-1" rows={5} value={text} onChange={e=>setText(e.target.value)} />
      <button type="submit" disabled={pending} className="bg-gray-900 text-white rounded px-3 py-2 text-sm">{pending ? 'Sending…' : 'Send email'}</button>
    </form>
  );
}
