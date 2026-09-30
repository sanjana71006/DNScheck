import mongoose, { Schema, Document } from 'mongoose';
import { ScanOverallStatus, DNSRecordType } from '../shared/index.js';

export interface IScanDocument extends Document {
  domain: string;
  normalizedDomain: string;
  recordTypes: DNSRecordType[];
  scanType: 'manual' | 'scheduled' | 'demo';
  isDemo: boolean;
  startedAt: Date;
  completedAt: Date;
  status: ScanOverallStatus;
  propagationPercentage: number;
  resolverAgreement: number;
  authoritativeNameservers: any[];
  authoritativeSummary: any;
  recordPropagation: Record<string, any>;
  recordSummary: Record<string, any>;
  securityScorecard: any;
  durationMs: number;
}

const ScanSchema = new Schema<IScanDocument>(
  {
    domain: { type: String, required: true, index: true },
    normalizedDomain: { type: String, required: true, index: true },
    recordTypes: [{ type: String, required: true }],
    scanType: { type: String, enum: ['manual', 'scheduled', 'demo'], default: 'manual' },
    isDemo: { type: Boolean, default: false, index: true },
    startedAt: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['HEALTHY', 'PROPAGATING', 'WARNING', 'ERROR'],
      default: 'PROPAGATING',
      index: true
    },
    propagationPercentage: { type: Number, default: 0 },
    resolverAgreement: { type: Number, default: 0 },
    authoritativeNameservers: { type: Schema.Types.Mixed, default: [] },
    authoritativeSummary: { type: Schema.Types.Mixed, default: {} },
    recordPropagation: { type: Schema.Types.Mixed, default: {} },
    recordSummary: { type: Schema.Types.Mixed, default: {} },
    securityScorecard: { type: Schema.Types.Mixed, default: {} },
    durationMs: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

ScanSchema.index({ normalizedDomain: 1, startedAt: -1 });

export const Scan = mongoose.model<IScanDocument>('Scan', ScanSchema);
