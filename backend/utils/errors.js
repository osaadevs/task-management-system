exports.errorResponse = (res, statusCode, errorCode, message, description = null) =>
  res.status(statusCode).json({
    errorCode,
    message,
    description,
  });

exports.PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
