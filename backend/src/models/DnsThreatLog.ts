import mongoose, { Schema, Document } from 'mongoose';

export type ThreatCategory = 'MALICIOUS_C2' | 'RECON_SCAN' | 'BIND_FINGERPRINT' | 'SUSPICIOUS' | 'BENIGN';

export interface IDnsThreatLogDocument extends Document {
  timestamp: Date;
  sourceIP: string;
  destinationIP: string;
  dnsQuery: string;
  dnsAnswers: string[];
  dnsAnswerTTLs: number[];
  dnsQueryNames: string;
  dnsQueryClass: string;
  dnsQueryType: string;
  numberOfAnswers: number;
  dnsResponseCode: number;
  dnsOpCode: number;
  sensorId: string;
  isSuspicious: boolean;
  isEvil: boolean;
  threatCategory: ThreatCategory;
  threatDescription: string;
  riskScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const DnsThreatLogSchema = new Schema<IDnsThreatLogDocument>(
  {
    timestamp: { type: Date, required: true, index: true },
    sourceIP: { type: String, required: true, index: true },
    destinationIP: { type: String, required: true },
    dnsQuery: { type: String, required: true, index: true },
    dnsAnswers: [{ type: String }],
    dnsAnswerTTLs: [{ type: Number }],
    dnsQueryNames: { type: String },
    dnsQueryClass: { type: String, default: 'IN' },
    dnsQueryType: { type: String, default: 'A', index: true },
    numberOfAnswers: { type: Number, default: 0 },
    dnsResponseCode: { type: Number, default: 0 },
    dnsOpCode: { type: Number, default: 0 },
    sensorId: { type: String, required: true, index: true },
    isSuspicious: { type: Boolean, default: false, index: true },
    isEvil: { type: Boolean, default: false, index: true },
    threatCategory: {
      type: String,
      enum: ['MALICIOUS_C2', 'RECON_SCAN', 'BIND_FINGERPRINT', 'SUSPICIOUS', 'BENIGN'],
      default: 'BENIGN',
      index: true
    },
    threatDescription: { type: String, default: 'Normal legitimate query' },
    riskScore: { type: Number, default: 0, index: true }
  },
  {
    timestamps: true
  }
);

DnsThreatLogSchema.index({ isEvil: 1, isSuspicious: 1 });
DnsThreatLogSchema.index({ dnsQuery: 'text' });

export const DnsThreatLog = mongoose.model<IDnsThreatLogDocument>('DnsThreatLog', DnsThreatLogSchema);
