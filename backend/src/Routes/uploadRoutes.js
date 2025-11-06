import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { authenticateToken } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Add your file type validation here
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs and documents are allowed.'), false);
    }
  }
});

// Handle file uploads
router.post('/', 
  authenticateToken,
  uploadLimiter,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          status: 'error',
          message: 'No file uploaded' 
        });
      }

      // Create file URL
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      
      logger.info('File uploaded successfully', {
        userId: req.user.userId,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      res.status(200).json({
        status: 'success',
        message: 'File uploaded successfully',
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: fileUrl
        }
      });
    } catch (error) {
      logger.error('File upload error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to upload file',
        error: error.message
      });
    }
});

// Handle errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum size is 10MB'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
  
  logger.error('Upload route error:', error);
  res.status(500).json({
    status: 'error',
    message: error.message || 'An unknown error occurred'
  });
});

export default router;
