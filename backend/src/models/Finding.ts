import mongoose, { Schema, Document } from 'mongoose';
import { FindingSeverity, FindingCategory } from '../shared/index.js';

export interface IFindingDocument extends Document {
  scanId: mongoose.Types.ObjectId;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string;
  recordType?: string;
  evidence: string;
  recommendation: string;
}

const FindingSchema = new Schema<IFindingDocument>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: 'Scan', required: true, index: true },
    severity: { type: String, enum: ['CRITICAL', 'WARNING', 'INFO'], required: true, index: true },
    category: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    recordType: { type: String },
    evidence: { type: String, required: true },
    recommendation: { type: String, required: true }
  },
  {
    timestamps: true
  }
);

export const Finding = mongoose.model<IFindingDocument>('Finding', FindingSchema);
