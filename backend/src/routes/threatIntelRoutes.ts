import { Router } from 'express';
import {
  getThreatLogs,
  getThreatStats,
  lookupDomain,
  seedThreatData
} from '../controllers/threatIntelController.js';

const router = Router();

router.get('/', getThreatLogs);
router.get('/stats', getThreatStats);
router.get('/lookup/:domain', lookupDomain);
router.post('/seed', seedThreatData);

export default router;
