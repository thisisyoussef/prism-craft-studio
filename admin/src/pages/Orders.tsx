import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Order = {
  id: string;
  orderNumber: string;
  productCategory?: string;
  productName?: string;
  quantity?: number;
  totalAmount?: number;
  status: string;
  customerEmail?: string;
  customerName?: string;
  companyName?: string;
  createdAt?: string;
};

export default function Orders() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders');
      return res.data;
    },
  });

  const [q, setQ] = useState('');
  const items = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(o =>
      (o.orderNumber ?? '').toLowerCase().includes(s) ||
      (o.customerEmail ?? '').toLowerCase().includes(s) ||
      (o.customerName ?? '').toLowerCase().includes(s) ||
      (o.companyName ?? '').toLowerCase().includes(s)
    );
  }, [data, q]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Orders</h1>
      <div className="flex items-center gap-2">
        <input
          placeholder="Search by order, email, name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded px-3 py-2 w-full max-w-md"
        />
      </div>

      {isLoading && <div>Loading…</div>}
      {isError && <div className="text-red-700">{(error as any)?.message || 'Failed to load orders'}</div>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{o.orderNumber}</div>
                    <div className="text-gray-500">{o.productName || o.productCategory}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{o.customerName}</div>
                    <div className="text-gray-500">{o.customerEmail}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs capitalize">{o.status}</span>
                  </td>
                  <td className="px-3 py-2">${o.totalAmount?.toFixed(2) ?? '-'}</td>
                  <td className="px-3 py-2 text-right">
                    <Link to={`/orders/${o.id}`} className="text-brand-700 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="text-gray-500 text-sm p-6">No orders found</div>
          )}
        </div>
      )}
    </div>
  );
}
