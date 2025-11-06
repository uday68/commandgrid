import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';
import { pool } from '../Config/database.js';

// Configure storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      console.log('Created/verified upload directory:', uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and text files are allowed.'), false);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files per request
  }
});

/**
 * Save file metadata to database
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.filename - Filename
 * @param {string} params.originalName - Original filename
 * @param {string} params.mimeType - File MIME type
 * @param {string} [params.projectId] - Project ID (optional)
 * @returns {Promise<Object>} File metadata
 */
export const saveFileMetadata = async ({ userId, filename, originalName, mimeType, projectId = null }) => {
  try {
    const result = await pool.query(
      `INSERT INTO file_uploads 
       (user_id, project_id, filename, original_name, mime_type, upload_date)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId, projectId, filename, originalName, mimeType]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to save file metadata:', error);
    throw error;
  }
};

/**
 * Get file metadata by ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} File metadata
 */
export const getFileMetadata = async (fileId) => {
  try {
    const result = await pool.query(
      'SELECT * FROM file_uploads WHERE id = $1',
      [fileId]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to get file metadata:', error);
    throw error;
  }
};

/**
 * Delete file and its metadata
 * @param {string} fileId - File ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<boolean>} Success status
 */
export const deleteFile = async (fileId, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get file metadata
    const fileResult = await client.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (!fileResult.rows[0]) {
      throw new Error('File not found or unauthorized');
    }

    const file = fileResult.rows[0];

    // Delete file from storage
    const filePath = path.join(process.cwd(), 'uploads', file.filename);
    await fs.unlink(filePath);

    // Delete metadata from database
    await client.query(
      'DELETE FROM file_uploads WHERE id = $1',
      [fileId]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to delete file:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get files for a user or project
 * @param {Object} params
 * @param {string} [params.userId] - User ID
 * @param {string} [params.projectId] - Project ID
 * @param {number} [limit=50] - Number of files to return
 * @returns {Promise<Array>} File metadata list
 */
export const getFiles = async ({ userId = null, projectId = null, limit = 50 }) => {
  try {
    let query = 'SELECT * FROM file_uploads WHERE 1=1';
    const values = [];
    let valueIndex = 1;

    if (userId) {
      query += ` AND user_id = $${valueIndex}`;
      values.push(userId);
      valueIndex++;
    }

    if (projectId) {
      query += ` AND project_id = $${valueIndex}`;
      values.push(projectId);
      valueIndex++;
    }

    query += ` ORDER BY upload_date DESC LIMIT $${valueIndex}`;
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    logger.error('Failed to get files:', error);
    throw error;
  }
}; 