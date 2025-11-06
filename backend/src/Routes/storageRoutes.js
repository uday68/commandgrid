import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { logActivity } from '../middleware/activityLogger.js';
import { handleError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            console.log('Storage directory created/verified:', uploadDir);
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',');
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// File upload schema
const uploadSchema = z.object({
    file: z.any(),
    metadata: z.object({
        projectId: z.string().optional(),
        taskId: z.string().optional(),
        description: z.string().optional()
    }).optional()
});

// Upload file
router.post('/upload',
    authenticateToken,
    apiLimiter,
    upload.single('file'),
    validateRequest(uploadSchema),
    async (req, res, next) => {
        try {
            if (!req.file) {
                throw new Error('No file uploaded');
            }

            const filePath = req.file.path;
            const fileUrl = `/uploads/${path.basename(filePath)}`;

            await logActivity(req.user.id, 'FILE_UPLOAD', {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                fileType: req.file.mimetype
            });

            res.status(201).json({
                success: true,
                data: {
                    url: fileUrl,
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    fileType: req.file.mimetype,
                    metadata: req.body.metadata
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get file
router.get('/files/:filename',
    authenticateToken,
    apiLimiter,
    cacheMiddleware('file'),
    async (req, res, next) => {
        try {
            const filename = req.params.filename;
            const filePath = path.join(__dirname, '../../uploads', filename);

            try {
                await fs.access(filePath);
            } catch (error) {
                throw new Error('File not found');
            }

            res.sendFile(filePath);
        } catch (error) {
            next(error);
        }
    }
);

// Delete file
router.delete('/files/:filename',
    authenticateToken,
    apiLimiter,
    async (req, res, next) => {
        try {
            const filename = req.params.filename;
            const filePath = path.join(__dirname, '../../uploads', filename);

            try {
                await fs.unlink(filePath);
            } catch (error) {
                throw new Error('File not found');
            }

            await logActivity(req.user.id, 'FILE_DELETE', {
                fileName: filename
            });

            res.json({
                success: true,
                message: 'File deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

// List files
router.get('/files',
    authenticateToken,
    apiLimiter,
    cacheMiddleware('file-list'),
    async (req, res, next) => {
        try {
            const uploadDir = path.join(__dirname, '../../uploads');
            const files = await fs.readdir(uploadDir);
            
            const fileDetails = await Promise.all(files.map(async (file) => {
                const filePath = path.join(uploadDir, file);
                const stats = await fs.stat(filePath);
                return {
                    name: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    updatedAt: stats.mtime
                };
            }));

            res.json({
                success: true,
                data: fileDetails
            });
        } catch (error) {
            next(error);
        }
    }
);

// Cleanup old files
const cleanupOldFiles = async () => {
    try {
        const uploadDir = path.join(__dirname, '../../uploads');
        const files = await fs.readdir(uploadDir);
        const retentionDays = parseInt(process.env.FILE_RETENTION_DAYS) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        for (const file of files) {
            const filePath = path.join(uploadDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
                await fs.unlink(filePath);
                logger.info(`Deleted old file: ${file}`);
            }
        }
    } catch (error) {
        logger.error('Error cleaning up old files:', error);
    }
};

// Run cleanup daily
setInterval(cleanupOldFiles, 24 * 60 * 60 * 1000);

export default router; 