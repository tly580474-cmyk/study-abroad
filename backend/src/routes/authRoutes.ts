import { Router } from 'express';
import { login, register, getProfile, sendCode, verifyCode, registerWithEmail } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/send-code', sendCode);
router.post('/verify-code', verifyCode);
router.post('/register-with-email', registerWithEmail);
router.get('/profile', authenticate, getProfile);

export default router;
