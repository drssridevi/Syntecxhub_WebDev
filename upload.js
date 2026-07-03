const multer = require('multer');
const ApiError = require('../utils/ApiError');

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024; // 10 MB default

// Default safe set of mime types if none configured via env
const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/json',
];

const ALLOWED_MIME_TYPES = process.env.ALLOWED_MIME_TYPES
  ? process.env.ALLOWED_MIME_TYPES.split(',').map((t) => t.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_MIME_TYPES;

// Use memory storage: we buffer the file briefly, then stream it into GridFS ourselves.
// This avoids relying on third-party GridFS multer storage engines and gives us
// full control over filenames, metadata, and error handling.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new ApiError(
        415,
        `Unsupported file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      )
    );
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // one file per request for the single-upload endpoint
  },
  fileFilter,
});

/**
 * Wraps a multer middleware so that its errors are forwarded to the
 * central Express error handler as ApiError instances instead of
 * crashing or producing multer's raw error shape.
 */
function handleUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new ApiError(413, `File too large. Max size is ${MAX_FILE_SIZE} bytes.`)
          );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new ApiError(400, `Unexpected field: ${err.field}`));
        }
        return next(new ApiError(400, err.message));
      }
      if (err) {
        return next(err instanceof ApiError ? err : new ApiError(400, err.message));
      }
      next();
    });
  };
}

module.exports = {
  uploadSingle: handleUpload(upload.single('file')),
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
