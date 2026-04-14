import { Router } from 'express';
import {
  createSchoolPost,
  getSchoolPosts,
  getSchoolPostById,
  updateSchoolPost,
  deleteSchoolPost,
  getMySchoolPosts,
} from '../controllers/schoolPostController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/my', authenticate, getMySchoolPosts);
router.get('/school/:schoolId', getSchoolPosts);
router.get('/:id', getSchoolPostById);
router.post('/', authenticate, createSchoolPost);
router.put('/:id', authenticate, updateSchoolPost);
router.delete('/:id', authenticate, deleteSchoolPost);

export default router;