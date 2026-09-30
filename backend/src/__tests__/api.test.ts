import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';

describe('DNSCheck API Endpoints', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('GET /api/health returns operational status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('DNSCheck Backend API');
  });

  it('POST /api/scans rejects invalid domain names', async () => {
    const res = await request(app)
      .post('/api/scans')
      .send({ domain: 'invalid..domain!@#' });
    expect(res.status).toBe(500); // Or 400 from validation
    expect(res.body.success).toBe(false);
  });

  it('POST /api/scans executes a demo scan instantly', async () => {
    const res = await request(app)
      .post('/api/scans')
      .send({ domain: 'healthy.acme-cloud.io', isDemo: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.domain).toBe('healthy.acme-cloud.io');
    expect(res.body.data.overallStatus).toBe('HEALTHY');
    expect(res.body.data.propagationPercentage).toBe(100);
    expect(res.body.data.isDemo).toBe(true);
  });
});
