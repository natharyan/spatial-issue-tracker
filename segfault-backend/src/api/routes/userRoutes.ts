import express from 'express';
import { getMe, getMyIssues, getMyComments } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.get('/me', authMiddleware, getMe);
router.get('/me/issues', authMiddleware, getMyIssues);
router.get('/me/comments', authMiddleware, getMyComments);

export default router;
