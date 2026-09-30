import mongoose, { Schema, Document } from 'mongoose';
import { DNSRecordType } from '../shared/index.js';

export interface IDNSRecordDocument extends Document {
  scanId: mongoose.Types.ObjectId;
  domain: string;
  name: string;
  type: DNSRecordType;
  values: string[];
  ttl?: number;
  source: 'authoritative' | 'resolver_consensus';
  propagationPercentage: number;
  status: 'MATCH' | 'MISMATCH' | 'WARNING' | 'DIFFERENT';
}

const DNSRecordSchema = new Schema<IDNSRecordDocument>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: 'Scan', required: true, index: true },
    domain: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true, index: true },
    values: [{ type: String }],
    ttl: { type: Number },
    source: { type: String, enum: ['authoritative', 'resolver_consensus'], required: true },
    propagationPercentage: { type: Number, default: 0 },
    status: { type: String, enum: ['MATCH', 'MISMATCH', 'WARNING', 'DIFFERENT'], default: 'MATCH' }
  },
  {
    timestamps: true
  }
);

DNSRecordSchema.index({ scanId: 1, type: 1 });

export const DNSRecord = mongoose.model<IDNSRecordDocument>('DNSRecord', DNSRecordSchema);
