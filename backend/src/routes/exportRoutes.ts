import { Router } from 'express';
import { exportApplications, exportUsers } from '../controllers/exportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/applications', authenticate, exportApplications);
router.get('/users', authenticate, exportUsers);

export default router;
