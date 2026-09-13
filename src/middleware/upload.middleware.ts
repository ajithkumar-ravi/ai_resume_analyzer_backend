import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/octet-stream', // Some browsers send octet-stream for docx
];

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const originalName = file.originalname.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => originalName.endsWith(ext));
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (hasValidExt && (hasValidMime || file.mimetype.includes('pdf') || file.mimetype.includes('word') || file.mimetype.includes('document'))) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type "${file.mimetype}". Only PDF and DOCX documents (.pdf, .docx) are supported.`
      )
    );
  }
};

export const uploadResumeMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter,
});
