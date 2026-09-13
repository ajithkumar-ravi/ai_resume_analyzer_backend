import { Router } from 'express';
import {
  analyzeResume,
  getRecentAnalyses,
  getAnalysisById,
  healthCheck,
} from '../controllers/analysis.controller.ts';
import { uploadResumeMiddleware } from '../middleware/upload.middleware.ts';
import { analyzeRateLimiter } from '../middleware/rateLimiter.middleware.ts';
import { validateAnalyzeRequest } from '../middleware/validate.middleware.ts';

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
