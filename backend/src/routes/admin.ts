import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeAdmin } from '../middleware/authorizeAdmin.js';

const router = Router();

// GET /api/admin/security-stats - Requires Firebase Auth and Admin authorization
router.get('/security-stats', authenticate, authorizeAdmin, adminController.getSecurityStats);

export default router;
