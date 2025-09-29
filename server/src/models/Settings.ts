import mongoose, { Schema, Document, Model } from 'mongoose';

export interface LeadTimeRange {
  minDays: number;
  maxDays: number;
}

export interface BusinessCalendar {
  timezone: string; // e.g., 'America/New_York'
  workingDays: string[]; // e.g., ['Mon','Tue','Wed','Thu','Fri']
}

export interface SettingsDocument extends Document {
  leadTimes?: {
    production?: LeadTimeRange;
    shipping?: LeadTimeRange;
    businessCalendar?: BusinessCalendar;
    updatedAt?: Date;
    updatedByUserId?: string;
  };
}

const SettingsSchema = new Schema<SettingsDocument>({
  leadTimes: { type: Schema.Types.Mixed },
}, { timestamps: true, collection: 'settings' });

export const Settings: Model<SettingsDocument> = mongoose.models.Settings || mongoose.model<SettingsDocument>('Settings', SettingsSchema);

export async function getGlobalLeadTimes() {
  const doc = await Settings.findOne({}).lean();
  const defaults = {
    production: { minDays: 7, maxDays: 10 },
    shipping: { minDays: 2, maxDays: 4 },
    businessCalendar: { timezone: 'America/New_York', workingDays: ['Mon','Tue','Wed','Thu','Fri'] },
  };
  const lt = (doc as any)?.leadTimes || {};
  return {
    production: lt.production || defaults.production,
    shipping: lt.shipping || defaults.shipping,
    businessCalendar: lt.businessCalendar || defaults.businessCalendar,
  } as { production: LeadTimeRange; shipping: LeadTimeRange; businessCalendar: BusinessCalendar };
}
