import mongoose, { Schema } from 'mongoose';

const GuestDraftSchema = new Schema(
  {
    type: { type: String, enum: ['quote', 'sample'], required: true },
    info: { type: Schema.Types.Mixed, default: {} },
    address: { type: Schema.Types.Mixed, default: {} },
    draft: { type: Schema.Types.Mixed, default: {} },
    totals: { type: Schema.Types.Mixed, default: {} },
    pricing: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const GuestDraft = mongoose.models.GuestDraft || mongoose.model('GuestDraft', GuestDraftSchema);
