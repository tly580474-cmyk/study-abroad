import { Router } from 'express';
import {
  getApplications,
  getApplicationById,
  createApplication,
  submitApplication,
  withdrawApplication,
  deleteApplication,
  reviewApplication,
  approveApplication,
} from '../controllers/applicationController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.post('/', authorize('student'), createApplication);
router.post('/:id/submit', authorize('student'), submitApplication);
router.post('/:id/withdraw', authorize('student', 'admin'), withdrawApplication);
router.delete('/:id', authorize('student', 'admin'), deleteApplication);
router.post('/:id/review', authorize('reviewer', 'admin'), reviewApplication);
router.post('/:id/approve', authorize('approver', 'admin'), approveApplication);

export default router;
