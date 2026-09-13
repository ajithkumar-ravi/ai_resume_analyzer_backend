import { Router } from 'express';
import {
  analyzeResume,
  getRecentAnalyses,
  getAnalysisById,
  healthCheck,
} from '../controllers/analysis.controller.js';
import { uploadResumeMiddleware } from '../middleware/upload.middleware.js';
import { analyzeRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { validateAnalyzeRequest } from '../middleware/validate.middleware.js';

const router = Router();

// Health check endpoint
router.get('/health', healthCheck);

// Resume analysis endpoint with multer memory upload, rate limiting, and input validation
router.post(
  '/analyze',
  analyzeRateLimiter,
  uploadResumeMiddleware.single('resume'),
  validateAnalyzeRequest,
  analyzeResume
);

// History endpoints
router.get('/analyses/:sessionId', getRecentAnalyses);
router.get('/analyses/item/:id', getAnalysisById);

export default router;
