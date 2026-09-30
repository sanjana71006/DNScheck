import { Router } from 'express';
import { MonitoringController, CreateMonitoringJobSchema } from '../controllers/monitoringController.js';
import { validateRequest } from '../middleware/validator.js';

const router = Router();

router.post('/', validateRequest(CreateMonitoringJobSchema), MonitoringController.createJob);
router.get('/', MonitoringController.listJobs);
router.patch('/:id', MonitoringController.toggleJob);
router.delete('/:id', MonitoringController.deleteJob);
router.get('/:id/snapshots', MonitoringController.getSnapshots);

export const monitoringRoutes = router;
