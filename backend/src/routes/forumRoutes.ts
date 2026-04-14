import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
  getMyPosts,
} from '../controllers/forumController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', getPosts);
router.get('/my', authenticate, getMyPosts);
router.get('/:id', getPostById);
router.post('/', authenticate, createPost);
router.put('/:id', authenticate, updatePost);
router.delete('/:id', authenticate, deletePost);
router.post('/:id/like', authenticate, toggleLike);
router.get('/:id/comments', getComments);
router.post('/:id/comments', authenticate, addComment);
router.delete('/comments/:commentId', authenticate, deleteComment);

export default router;