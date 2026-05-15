const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(res, errors.array()[0].msg, 'VALIDATION_ERROR', 422);
  }
  next();
}

module.exports = validate;
