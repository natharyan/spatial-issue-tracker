import express from 'express';
import { handleGoogleCallback, handleGoogleLogin, handleGuestLogin, handleRegister, handleLogin, changePassword } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.get('/callback', handleGoogleCallback);
router.post('/google', handleGoogleLogin);
router.post('/guest', handleGuestLogin);
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/change-password', authMiddleware, changePassword);

export default router;
