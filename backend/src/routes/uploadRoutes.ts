import { Router } from 'express';
import {
  uploadImage,
  uploadVideo,
  getMediaList,
  deleteMedia,
} from '../controllers/mediaController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/image', ...uploadImage);
router.post('/video', ...uploadVideo);
router.get('/', authenticate, getMediaList);
router.delete('/:id', authenticate, deleteMedia);

export default router;