import mongoose, { Schema, Document } from 'mongoose';
import { ScanOverallStatus } from '../shared/index.js';

export interface IMonitoringSnapshotDocument extends Document {
  jobId: mongoose.Types.ObjectId;
  domain: string;
  timestamp: Date;
  propagationPercentage: number;
  resolverAgreement: number;
  status: ScanOverallStatus;
  findingsCount: {
    critical: number;
    warning: number;
    info: number;
  };
  durationMs: number;
}

const MonitoringSnapshotSchema = new Schema<IMonitoringSnapshotDocument>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'MonitoringJob', required: true, index: true },
    domain: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    propagationPercentage: { type: Number, default: 0 },
    resolverAgreement: { type: Number, default: 0 },
    status: { type: String, enum: ['HEALTHY', 'PROPAGATING', 'WARNING', 'ERROR'], required: true },
    findingsCount: {
      critical: { type: Number, default: 0 },
      warning: { type: Number, default: 0 },
      info: { type: Number, default: 0 }
    },
    durationMs: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically purge monitoring snapshots older than 30 days
MonitoringSnapshotSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const MonitoringSnapshot = mongoose.model<IMonitoringSnapshotDocument>('MonitoringSnapshot', MonitoringSnapshotSchema);
