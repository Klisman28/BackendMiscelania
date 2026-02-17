const { ValidationError } = require('sequelize');
const { error } = require('../routes/response');
const boom = require('@hapi/boom');

function logErrors(err, req, res, next) {
  console.error(err);
  next(err);
}

function multerErrorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    const error = boom.payloadTooLarge('File too large');
    const { output } = error;
    // Call generic response handler
    const { error: errorRes } = require('../routes/response');
    errorRes(res, output.statusCode, output.payload.message, output.payload.error);
    return;
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const error = boom.badRequest('Unexpected field or file type');
    const { output } = error;
    const { error: errorRes } = require('../routes/response');
    errorRes(res, output.statusCode, output.payload.message, output.payload.error);
    return;
  }
  next(err);
}

function boomErrorHandler(err, req, res, next) {
  if (err.isBoom) {
    const { output } = err;
    error(res, output.statusCode, output.payload.message, output.payload.error);
    return; // ✅ Detiene el flujo

  }
  next(err);
}

function ormErrorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    const errors = err.errors.map((item) => {
      return {
        type: item.type,
        message: item.message,
        path: item.path,
        value: item.value
      }
    });

    error(res, 409, err.name, errors);
    return; // ✅ Detiene el flujo

  }
  next(err);
}

function errorHandler(err, req, res, next) {
  error(res, 500, err.message, { stack: err.stack });
  return; // ✅ Detiene el flujo

}

module.exports = { logErrors, errorHandler, boomErrorHandler, ormErrorHandler, multerErrorHandler }