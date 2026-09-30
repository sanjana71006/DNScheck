import mongoose, { Schema, Document } from 'mongoose';
import { DNSRecordType, QueryStatus } from '../shared/index.js';

export interface IResolverResultDocument extends Document {
  scanId: mongoose.Types.ObjectId;
  domain: string;
  resolverId: string;
  provider: string;
  resolverIp: string;
  locationLabel: string;
  country: string;
  continent: string;
  latitude: number;
  longitude: number;
  recordType: DNSRecordType;
  status: QueryStatus;
  answers: string[];
  normalizedAnswers: string[];
  ttl?: number;
  responseTimeMs: number;
  error?: string;
  matchesCanonical?: boolean;
  networkType?: string;
  evidenceTag?: string;
  isLive?: boolean;
  whyDifferent?: any;
  checkedAt: Date;
}

const ResolverResultSchema = new Schema<IResolverResultDocument>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: 'Scan', required: true, index: true },
    domain: { type: String, required: true },
    resolverId: { type: String, required: true },
    provider: { type: String, required: true },
    resolverIp: { type: String, required: true },
    locationLabel: { type: String, required: true },
    country: { type: String, required: true },
    continent: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    recordType: { type: String, required: true },
    status: {
      type: String,
      enum: ['SUCCESS', 'NXDOMAIN', 'SERVFAIL', 'TIMEOUT', 'ERROR', 'MISMATCH', 'MATCH', 'DIFFERENT'],
      required: true
    },
    answers: [{ type: String }],
    normalizedAnswers: [{ type: String }],
    ttl: { type: Number },
    responseTimeMs: { type: Number, default: 0 },
    error: { type: String },
    matchesCanonical: { type: Boolean, default: false },
    networkType: { type: String },
    evidenceTag: { type: String },
    isLive: { type: Boolean },
    whyDifferent: { type: Schema.Types.Mixed },
    checkedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

ResolverResultSchema.index({ scanId: 1, recordType: 1 });

export const ResolverResult = mongoose.model<IResolverResultDocument>('ResolverResult', ResolverResultSchema);
