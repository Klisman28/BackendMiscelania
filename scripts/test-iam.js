/**
 * test-iam.js — Script de verificación completa IAM + S3 + Presigned URLs
 *
 * USO:
 *   node scripts/test-iam.js
 *
 * Requiere en .env (o variables de entorno):
 *   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET
 */

require('dotenv').config();

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.AWS_S3_BUCKET || 'imagepos';
const PREFIX = process.env.AWS_S3_PREFIX || 'image/';
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const credentials = { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY };

const s3 = new S3Client({
    region: REGION,
    credentials,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
});

const sts = new STSClient({ region: REGION, credentials });

// ── Helpers ─────────────────────────────────────────────────────────────────
const OK = (msg) => console.log(`  ✅ ${msg}`);
const FAIL = (msg, err) => {
    console.error(`  ❌ ${msg}`);
    if (err) {
        console.error(`     Code: ${err.Code || err.name || 'N/A'}`);
        console.error(`     Message: ${err.message}`);
    }
};
const HEADER = (msg) => console.log(`\n${'═'.repeat(60)}\n  ${msg}\n${'═'.repeat(60)}`);

// ── Crear archivo de prueba si no existe ────────────────────────────────────
function createTestFile() {
    const testPath = path.join(__dirname, 'test.png');
    if (!fs.existsSync(testPath)) {
        // Crear un PNG mínimo válido (1x1 pixel rojo)
        const pngBuffer = Buffer.from(
            '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
            '2e00000000c4944415408d7636860000000600010e0021a00000000004945' +
            '4e44ae426082',
            'hex'
        );
        fs.writeFileSync(testPath, pngBuffer);
        console.log(`  📄 Creado archivo de prueba: ${testPath}`);
    }
    return testPath;
}

// ── Tests ───────────────────────────────────────────────────────────────────
async function testCallerIdentity() {
    HEADER('1. Verificar Identidad IAM (STS GetCallerIdentity)');
    try {
        const result = await sts.send(new GetCallerIdentityCommand({}));
        OK(`Account:  ${result.Account}`);
        OK(`UserArn:  ${result.Arn}`);
        OK(`UserId:   ${result.UserId}`);
        return true;
    } catch (err) {
        FAIL('No se pudo verificar identidad IAM', err);
        return false;
    }
}

async function testListBucket() {
    HEADER('2. Listar objetos en s3://' + BUCKET + '/' + PREFIX);
    try {
        const result = await s3.send(new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: PREFIX,
            MaxKeys: 5,
        }));
        OK(`Encontrados ${result.KeyCount || 0} objetos (mostrando max 5)`);
        if (result.Contents) {
            result.Contents.forEach(obj => {
                console.log(`     📦 ${obj.Key} (${obj.Size} bytes)`);
            });
        }
        return true;
    } catch (err) {
        FAIL('ListBucket falló', err);
        return false;
    }
}

async function testPutObject(testFilePath) {
    const uuid = crypto.randomUUID();
    const key = `${PREFIX}products/test/${uuid}.png`;
    HEADER('3. Subir objeto (PutObject)');
    console.log(`  📤 Key: ${key}`);

    try {
        const fileBuffer = fs.readFileSync(testFilePath);
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: fileBuffer,
            ContentType: 'image/png',
        }));
        OK(`Objeto subido exitosamente`);
        return key;
    } catch (err) {
        FAIL('PutObject falló', err);
        return null;
    }
}

async function testGetObject(key) {
    HEADER('4. Leer objeto (GetObject)');
    try {
        const result = await s3.send(new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        }));
        OK(`ContentType: ${result.ContentType}`);
        OK(`ContentLength: ${result.ContentLength} bytes`);
        OK(`ETag: ${result.ETag}`);
        // Consume stream
        const chunks = [];
        for await (const chunk of result.Body) {
            chunks.push(chunk);
        }
        OK(`Body leído: ${Buffer.concat(chunks).length} bytes`);
        return true;
    } catch (err) {
        FAIL('GetObject falló', err);
        return false;
    }
}

async function testPresignedPut() {
    const uuid = crypto.randomUUID();
    const key = `${PREFIX}products/test/${uuid}.png`;
    HEADER('5. Generar Presigned PUT URL');
    console.log(`  📤 Key: ${key}`);

    try {
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: 'image/png',
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 300 });
        OK(`Presigned PUT generada (expira en 300s)`);
        console.log(`  🔗 URL: ${url.substring(0, 120)}...`);

        // Simular upload con fetch (como haría el browser)
        const testBody = Buffer.from('fake-png-content');
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/png' },
            body: testBody,
        });

        if (response.ok) {
            OK(`PUT via presigned URL exitoso! Status: ${response.status}`);
        } else {
            const body = await response.text();
            FAIL(`PUT via presigned URL falló! Status: ${response.status}`, { message: body });
        }

        // Cleanup
        try {
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
            OK(`Objeto de prueba presigned eliminado: ${key}`);
        } catch (_) { /* ignore */ }

        return response.ok;
    } catch (err) {
        FAIL('Presigned PUT falló', err);
        return false;
    }
}

async function testPresignedGet(key) {
    HEADER('6. Generar Presigned GET URL');
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 60 });
        OK(`Presigned GET generada (expira en 60s)`);
        console.log(`  🔗 URL: ${url.substring(0, 120)}...`);
        console.log(`\n  👆 Abre esta URL en el navegador para verificar que muestra la imagen\n`);
        return true;
    } catch (err) {
        FAIL('Presigned GET falló', err);
        return false;
    }
}

async function testDeleteObject(key) {
    HEADER('7. Eliminar objeto (DeleteObject)');
    try {
        await s3.send(new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        }));
        OK(`Objeto eliminado: ${key}`);
        return true;
    } catch (err) {
        FAIL('DeleteObject falló', err);
        return false;
    }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🚀 Test IAM + S3 — Validación completa');
    console.log(`   Bucket: ${BUCKET}`);
    console.log(`   Region: ${REGION}`);
    console.log(`   Prefix: ${PREFIX}`);
    console.log(`   Access Key: ${ACCESS_KEY ? ACCESS_KEY.substring(0, 8) + '...' : '⚠️  NO DEFINIDA'}`);
    console.log(`   Secret Key: ${SECRET_KEY ? '****' + SECRET_KEY.slice(-4) : '⚠️  NO DEFINIDA'}`);

    if (!ACCESS_KEY || !SECRET_KEY) {
        console.error('\n❌ Faltan credenciales AWS. Revisa tu .env');
        process.exit(1);
    }

    const results = {};
    const testFile = createTestFile();

    // 1. Identidad
    results.identity = await testCallerIdentity();

    // 2. List
    results.list = await testListBucket();

    // 3. Put
    const uploadedKey = await testPutObject(testFile);
    results.put = !!uploadedKey;

    if (uploadedKey) {
        // 4. Get
        results.get = await testGetObject(uploadedKey);

        // 5. Presigned PUT
        results.presignedPut = await testPresignedPut();

        // 6. Presigned GET
        results.presignedGet = await testPresignedGet(uploadedKey);

        // 7. Delete
        results.delete = await testDeleteObject(uploadedKey);
    }

    // ── Resumen ─────────────────────────────────────────────────────────────
    HEADER('RESUMEN');
    const tests = [
        ['STS Identity', results.identity],
        ['ListBucket', results.list],
        ['PutObject', results.put],
        ['GetObject', results.get],
        ['Presigned PUT', results.presignedPut],
        ['Presigned GET', results.presignedGet],
        ['DeleteObject', results.delete],
    ];

    let allPassed = true;
    tests.forEach(([name, passed]) => {
        if (passed) {
            console.log(`  ✅ ${name}`);
        } else {
            console.log(`  ❌ ${name}`);
            allPassed = false;
        }
    });

    console.log(allPassed
        ? '\n🎉 TODOS LOS TESTS PASARON — IAM + S3 configurados correctamente!\n'
        : '\n⚠️  ALGUNOS TESTS FALLARON — revisa los errores arriba.\n'
    );

    // Limpiar archivo test
    try { fs.unlinkSync(testFile); } catch (_) { /* ignore */ }

    process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
