import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const analyzeBodySchema = z.object({
  jobDescription: z
    .string()
    .min(50, 'Job description must be at least 50 characters to perform an accurate match.')
    .max(12000, 'Job description exceeds maximum allowed length (12,000 characters).'),
  sessionId: z.string().max(64).optional(),
});

export function validateAnalyzeRequest(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Resume file is required. Please upload a PDF or DOCX file.',
    });
  }

  const parseResult = analyzeBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues?.[0];
    const firstError = firstIssue?.message || 'Invalid input parameters.';
    return res.status(400).json({
      success: false,
      error: firstError,
    });
  }

  // Attach parsed data to request
  req.body.jobDescription = parseResult.data.jobDescription;
  req.body.sessionId = parseResult.data.sessionId || 'anonymous';
  next();
}
