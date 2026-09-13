import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error(`Error processing ${req.method} ${req.url}:`, err.message || err);

  res.setHeader('Content-Type', 'application/json');

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File is too large. Maximum allowed resume size is 5MB.',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
  }

  const message = err.message || 'An unexpected error occurred while analyzing the resume.';
  let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  // If error is document parsing or unsupported format, treat as 400 Bad Request
  if (
    message.includes('Only PDF and DOCX') ||
    message.includes('Failed to parse') ||
    message.includes('Could not extract sufficient text') ||
    message.includes('Unsupported file format')
  ) {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
