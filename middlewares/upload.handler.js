const multer = require('multer');
const boom = require('@hapi/boom');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads/products');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.memoryStorage(); // Store in memory for processing with Sharp

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(boom.badRequest('Invalid image type. Only JPEG, PNG and WEBP are allowed'), false);
    }
};

const MAX_UPLOAD_MB = process.env.MAX_UPLOAD_MB || 2;

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_UPLOAD_MB * 1024 * 1024
    }
});

module.exports = upload;
