import { Router } from 'express';
import {
  createReview,
  getSchoolReviews,
  getReviewStats,
  updateReview,
  deleteReview,
  getMyReviews,
} from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, createReview);
router.get('/school/:schoolId', getSchoolReviews);
router.get('/stats/:schoolId', getReviewStats);
router.put('/:id', authenticate, updateReview);
router.delete('/:id', authenticate, deleteReview);
router.get('/my', authenticate, getMyReviews);

export default router;