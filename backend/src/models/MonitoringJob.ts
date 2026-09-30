import mongoose, { Schema, Document } from 'mongoose';
import { DNSRecordType, MonitoringInterval, ScanOverallStatus } from '../shared/index.js';

export interface IMonitoringJobDocument extends Document {
  domain: string;
  recordTypes: DNSRecordType[];
  expectedValues: Record<string, string[]>;
  interval: MonitoringInterval;
  active: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastStatus?: ScanOverallStatus;
  lastPropagation?: number;
}

const MonitoringJobSchema = new Schema<IMonitoringJobDocument>(
  {
    domain: { type: String, required: true, index: true },
    recordTypes: [{ type: String, required: true }],
    expectedValues: { type: Schema.Types.Mixed, default: {} },
    interval: { type: String, enum: ['1m', '5m', '15m', '30m', '1h'], default: '5m' },
    active: { type: Boolean, default: true, index: true },
    lastRunAt: { type: Date },
    nextRunAt: { type: Date },
    lastStatus: { type: String, enum: ['HEALTHY', 'PROPAGATING', 'WARNING', 'ERROR'] },
    lastPropagation: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

export const MonitoringJob = mongoose.model<IMonitoringJobDocument>('MonitoringJob', MonitoringJobSchema);
