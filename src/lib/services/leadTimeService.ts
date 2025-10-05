import api from '@/lib/api';

export type LeadTimeRange = { minDays: number; maxDays: number };
export type BusinessCalendar = { timezone: string; workingDays: string[] };

export type EffectiveLeadTimes = {
  production: LeadTimeRange;
  shipping: LeadTimeRange;
  businessCalendar: BusinessCalendar;
};

export async function getDefaults(): Promise<EffectiveLeadTimes> {
  const { data } = await api.get('/lead-times/defaults');
  return data as EffectiveLeadTimes;
}

export async function getEffectiveForProduct(productId: string): Promise<EffectiveLeadTimes> {
  const { data } = await api.get(`/lead-times/products/${productId}/effective`);
  return data as EffectiveLeadTimes;
}
