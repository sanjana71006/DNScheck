import { Router } from 'express';
import { ScanController, CreateScanSchema } from '../controllers/scanController.js';
import { validateRequest } from '../middleware/validator.js';
import { scanRateLimiter, perDomainCooldown } from '../middleware/rateLimiter.js';

const router = Router();

// Streaming scan execution via Server-Sent Events (SSE)
router.get('/scans/stream', perDomainCooldown, ScanController.streamScan);

// Quick Domain & Keyword to IP Lookup
router.get('/quick-lookup', ScanController.quickLookup);

// Standard scan execution
router.post('/scans', scanRateLimiter, perDomainCooldown, validateRequest(CreateScanSchema), ScanController.startScan);

// Scan details & sub-resources
router.get('/scans/:id', ScanController.getScan);
router.get('/scans/:id/propagation', ScanController.getPropagation);
router.get('/scans/:id/resolvers', ScanController.getResolvers);
router.get('/scans/:id/findings', ScanController.getFindings);
router.get('/scans/:id/records', ScanController.getRecords);
router.delete('/scans/:id', ScanController.deleteScan);

// History & Comparison
router.get('/history', ScanController.getHistory);
router.get('/compare', ScanController.compareScans);

export const scanRoutes = router;
