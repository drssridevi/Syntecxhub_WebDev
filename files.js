const express = require('express');
const { ObjectId } = require('mongodb');
const { Readable } = require('stream');
const { getBucket } = require('../config/db');
const { uploadSingle } = require('../middleware/upload');
const ApiError = require('../utils/ApiError');

const router = express.Router();

/**
 * Validates a route param as a MongoDB ObjectId, otherwise forwards a 400 error.
 */
function parseObjectId(id) {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid file id: ${id}`);
  }
  return new ObjectId(id);
}

/**
 * POST /api/files
 * Upload a single file (multipart/form-data, field name: "file").
 */
router.post('/', uploadSingle, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file provided. Attach a file under the "file" field.');
    }

    const bucket = getBucket();
    const { originalname, mimetype, size, buffer } = req.file;

    const uploadStream = bucket.openUploadStream(originalname, {
      contentType: mimetype,
      metadata: {
        originalName: originalname,
        uploadedAt: new Date(),
        size,
      },
    });

    Readable.from(buffer)
      .pipe(uploadStream)
      .on('error', (err) => next(new ApiError(500, `Upload failed: ${err.message}`)))
      .on('finish', () => {
        res.status(201).json({
          message: 'File uploaded successfully',
          file: {
            id: uploadStream.id,
            filename: originalname,
            contentType: mimetype,
            size,
          },
        });
      });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files
 * List all uploaded files with basic metadata.
 */
router.get('/', async (req, res, next) => {
  try {
    const bucket = getBucket();
    const files = await bucket.find({}).sort({ uploadDate: -1 }).toArray();

    res.json({
      count: files.length,
      files: files.map((f) => ({
        id: f._id,
        filename: f.filename,
        contentType: f.contentType,
        size: f.length,
        uploadDate: f.uploadDate,
        metadata: f.metadata,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/:id/info
 * Fetch metadata for a single file without downloading its content.
 */
router.get('/:id/info', async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id);
    const bucket = getBucket();
    const files = await bucket.find({ _id: id }).toArray();

    if (files.length === 0) {
      throw new ApiError(404, 'File not found');
    }

    const f = files[0];
    res.json({
      id: f._id,
      filename: f.filename,
      contentType: f.contentType,
      size: f.length,
      uploadDate: f.uploadDate,
      metadata: f.metadata,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/:id
 * Stream/download a file's content by id.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id);
    const bucket = getBucket();

    const files = await bucket.find({ _id: id }).toArray();
    if (files.length === 0) {
      throw new ApiError(404, 'File not found');
    }
    const fileDoc = files[0];

    res.set('Content-Type', fileDoc.contentType || 'application/octet-stream');
    res.set('Content-Length', fileDoc.length);

    const inline = req.query.inline === 'true';
    const disposition = inline ? 'inline' : 'attachment';
    res.set(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(fileDoc.filename)}"`
    );

    const downloadStream = bucket.openDownloadStream(id);

    downloadStream.on('error', (err) => {
      next(new ApiError(500, `Error streaming file: ${err.message}`));
    });

    downloadStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/files/:id
 * Delete a file (and its chunks) by id.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id);
    const bucket = getBucket();

    // Confirm existence first so we can return a proper 404 instead of a
    // generic driver error when the id doesn't correspond to a file.
    const files = await bucket.find({ _id: id }).toArray();
    if (files.length === 0) {
      throw new ApiError(404, 'File not found');
    }

    await bucket.delete(id);

    res.json({ message: 'File deleted successfully', id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
