const fs = require('fs');
const path = require('path');
const boom = require('@hapi/boom');

let sharp = null;
try {
    sharp = require('sharp');
} catch (error) {
    console.warn('Warning: sharp is not installed. Image processing is disabled.');
}

// Process image using Sharp and save to disk
const processImage = async (fileBuffer, directory = 'products') => {
    try {
        if (!sharp) {
            throw boom.internal('Procesamiento de imagen no disponible');
        }

        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const fileName = `product-${timestamp}-${random}.webp`;
        const uploadsDir = path.join(process.cwd(), 'public/uploads', directory);

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, fileName);

        await sharp(fileBuffer)
            .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .toFile(filePath);

        return fileName;
    } catch (error) {
        if (boom.isBoom(error)) throw error;
        throw boom.internal('Error processing the image.', error);
    }
};

const deleteFile = (fileName, directory = 'products') => {
    const filePath = path.join(process.cwd(), 'public/uploads', directory, fileName);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

module.exports = { processImage, deleteFile, sharp };

