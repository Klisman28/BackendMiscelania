const express = require('express');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const router = express.Router();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
});

const BUCKET = process.env.AWS_S3_BUCKET || 'imagepos';
const PREFIX = process.env.AWS_S3_PREFIX || 'image/';

// A) Presign PUT (subida)
// POST /api/v1/uploads/products/presign
router.post('/products/presign', async (req, res, next) => {
    try {
        const { fileName, contentType } = req.body;
        const companyId = req.user.companyId || req.companyId || 1; // get from JWT

        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedMimeTypes.includes(contentType)) {
            return res.status(400).json({ message: 'Invalid contentType' });
        }

        // fallback to uuid
        const uuid = crypto.randomUUID();
        const ext = fileName.split('.').pop() || 'png';
        const key = `${PREFIX}products/${companyId}/${uuid}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        res.json({
            uploadUrl,
            key
        });
    } catch (error) {
        next(error);
    }
});

// B) Presign GET (mostrar)
// GET /api/v1/uploads/products/signed?key=...
router.get('/products/signed', async (req, res, next) => {
    try {
        const { key } = req.query;
        if (!key) return res.status(400).json({ message: 'Missing key' });

        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({ url });
    } catch (error) {
        next(error);
    }
});

// C) Delete (opcional)
// DELETE /api/v1/uploads/products?key=...
router.delete('/products', async (req, res, next) => {
    try {
        const { key } = req.query;
        if (!key) return res.status(400).json({ message: 'Missing key' });

        const command = new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });

        await s3Client.send(command);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        next(error);
    }
});


// A) Presign PUT (subida logo)
router.post('/configs/presign', async (req, res, next) => {
    try {
        const { fileName, contentType } = req.body;
        const companyId = req.user?.companyId || req.companyId || 1;

        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowedMimeTypes.includes(contentType)) {
            return res.status(400).json({ message: 'Invalid contentType' });
        }

        const uuid = crypto.randomUUID();
        const ext = fileName.split('.').pop() || 'png';
        const key = `${PREFIX}configs/${companyId}/${uuid}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        res.json({ uploadUrl, key });
    } catch (error) {
        next(error);
    }
});

// B) Presign GET (mostrar logo)
router.get('/configs/signed', async (req, res, next) => {
    try {
        const { key } = req.query;
        if (!key) return res.status(400).json({ message: 'Missing key' });

        const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({ url });
    } catch (error) {
        next(error);
    }
});

// C) Delete (opcional)
router.delete('/configs', async (req, res, next) => {
    try {
        const { key } = req.query;
        if (!key) return res.status(400).json({ message: 'Missing key' });

        const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
        await s3Client.send(command);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
