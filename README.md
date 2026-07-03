# File Uploader API

An Express API for uploading, retrieving, and deleting files, using **Multer**
to parse `multipart/form-data` and **MongoDB GridFS** for storage.

## Stack

- Express 4
- Multer (memory storage) — parses incoming files, then they're streamed into GridFS
- MongoDB native driver's `GridFSBucket` (via Mongoose's connection) for storage
- Centralized error handling with consistent JSON error responses

## Setup

```bash
cd file-uploader
npm install
cp .env.example .env   # then edit MONGO_URI etc.
npm start               # or: npm run dev (nodemon)
```

Requires a running MongoDB instance (local or Atlas).

### Environment variables

| Variable             | Description                                            | Default                                   |
|----------------------|----------------------------------------------------------|-------------------------------------------|
| `MONGO_URI`          | MongoDB connection string                                 | required                                  |
| `PORT`               | Server port                                                | `5000`                                    |
| `MAX_FILE_SIZE`      | Max upload size in bytes                                   | `10485760` (10 MB)                        |
| `ALLOWED_MIME_TYPES` | Comma-separated whitelist of mime types                    | sensible built-in default set (see below) |

If `ALLOWED_MIME_TYPES` is unset, the API allows a default safe set (images,
PDF, text/csv, zip, common Office formats, JSON). Set it explicitly to
restrict further.

## API Endpoints

### `POST /api/files`
Upload a single file. `multipart/form-data`, field name **`file`**.

```bash
curl -F "file=@./photo.png" http://localhost:5000/api/files
```

**201 response:**
```json
{
  "message": "File uploaded successfully",
  "file": { "id": "665f...", "filename": "photo.png", "contentType": "image/png", "size": 12345 }
}
```

### `GET /api/files`
List all uploaded files (metadata only).

```bash
curl http://localhost:5000/api/files
```

### `GET /api/files/:id/info`
Get metadata for a single file (no content download).

```bash
curl http://localhost:5000/api/files/665f.../info
```

### `GET /api/files/:id`
Download/stream a file's content.
Add `?inline=true` to render inline (e.g. images/PDFs in a browser) instead
of forcing a download.

```bash
curl -OJ http://localhost:5000/api/files/665f...
```

### `DELETE /api/files/:id`
Delete a file and its chunks from GridFS.

```bash
curl -X DELETE http://localhost:5000/api/files/665f...
```

### `GET /health`
Basic health check.

## Validation & Error Handling

- Invalid/malformed `:id` params → `400`
- File exceeding `MAX_FILE_SIZE` → `413`
- Disallowed mime type → `415`
- Missing file on upload → `400`
- Non-existent file id on retrieve/delete → `404`
- Unhandled errors → `500`, logged server-side

All errors return a consistent shape:
```json
{ "error": { "message": "..." } }
```

## Project structure

```
file-uploader/
├── config/
│   └── db.js              # Mongoose connection + GridFSBucket setup
├── middleware/
│   ├── upload.js           # Multer config, mime/size validation
│   └── errorHandler.js     # 404 + centralized error responses
├── routes/
│   └── files.js            # upload / list / info / download / delete
├── utils/
│   └── ApiError.js         # HTTP-aware error class
├── server.js                # App bootstrap
├── .env.example
└── package.json
```

## Notes / possible extensions

- Add auth (e.g. JWT middleware) before the routes if files should be
  scoped to users.
- For very large files or high concurrency, consider streaming multer
  uploads directly (e.g. `busboy`) rather than buffering in memory.
- Add pagination to `GET /api/files` if the collection grows large.
