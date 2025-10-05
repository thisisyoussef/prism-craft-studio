import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

type LeadTimeRange = { minDays: number; maxDays: number };

type SettingsResponse = {
  production: LeadTimeRange;
  shipping: LeadTimeRange;
  businessCalendar: { timezone: string; workingDays: string[] };
};

const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const;

export default function LeadTimes() {
  const { data, isLoading, isError } = useQuery<SettingsResponse>({
    queryKey: ['lead-times','defaults'],
    queryFn: async () => {
      const res = await api.get('/lead-times/defaults');
      return res.data as SettingsResponse;
    },
  });

  const [draft, setDraft] = useState<SettingsResponse | null>(null);

  React.useEffect(() => {
    if (!data) return;
    setDraft({
      production: { ...data.production },
      shipping: { ...data.shipping },
      businessCalendar: { ...data.businessCalendar, workingDays: [...data.businessCalendar.workingDays] },
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SettingsResponse) => {
      const res = await api.put('/lead-times/defaults', payload);
      return res.data;
    },
  });

  const workingDaysSet = useMemo(() => new Set(draft?.businessCalendar.workingDays || []), [draft?.businessCalendar.workingDays]);

  if (isLoading) return <div>Loading lead time settings…</div>;
  if (isError) return <div className="text-red-600">Failed to load lead time settings</div>;
  if (!draft) return null;

  function toggleDay(day: string) {
    const curr = new Set(draft.businessCalendar.workingDays);
    if (curr.has(day)) curr.delete(day); else curr.add(day);
    setDraft({ ...draft, businessCalendar: { ...draft.businessCalendar, workingDays: Array.from(curr) } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Lead Time Settings</h1>
      </div>

      <div className="bg-white border rounded p-6 space-y-6">
        <section>
          <h2 className="font-medium mb-3">Production</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Min business days</label>
              <input type="number" className="w-full border rounded px-3 py-2" value={draft.production.minDays}
                onChange={(e) => setDraft({ ...draft, production: { ...draft.production, minDays: Math.max(0, parseInt(e.target.value) || 0) } })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Max business days</label>
              <input type="number" className="w-full border rounded px-3 py-2" value={draft.production.maxDays}
                onChange={(e) => setDraft({ ...draft, production: { ...draft.production, maxDays: Math.max(0, parseInt(e.target.value) || 0) } })}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-medium mb-3">Shipping</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Min business days</label>
              <input type="number" className="w-full border rounded px-3 py-2" value={draft.shipping.minDays}
                onChange={(e) => setDraft({ ...draft, shipping: { ...draft.shipping, minDays: Math.max(0, parseInt(e.target.value) || 0) } })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Max business days</label>
              <input type="number" className="w-full border rounded px-3 py-2" value={draft.shipping.maxDays}
                onChange={(e) => setDraft({ ...draft, shipping: { ...draft.shipping, maxDays: Math.max(0, parseInt(e.target.value) || 0) } })}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-medium mb-3">Business Calendar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Timezone (IANA)</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={draft.businessCalendar.timezone}
                onChange={(e) => setDraft({ ...draft, businessCalendar: { ...draft.businessCalendar, timezone: e.target.value } })}
                placeholder="America/New_York"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Working days</label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map(d => (
                  <label key={d} className={`px-2 py-1 rounded border text-sm cursor-pointer ${workingDaysSet.has(d) ? 'bg-gray-900 text-white' : ''}`}>
                    <input type="checkbox" className="hidden" checked={workingDaysSet.has(d)} onChange={() => toggleDay(d)} />
                    {d}
                  </label>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">Tip: Typically Monday–Friday only.</div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => data && setDraft({ production: { ...data.production }, shipping: { ...data.shipping }, businessCalendar: { ...data.businessCalendar, workingDays: [...data.businessCalendar.workingDays] } })}
            className="px-4 py-2 text-sm border rounded"
          >
            Reset
          </button>
          <button
            onClick={() => draft && saveMutation.mutate(draft)}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
