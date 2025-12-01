// Simple input validation helpers

exports.isEmail = (str) => {
  if (!str) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str);
};

exports.required = (value) => value !== undefined && value !== null && value !== '';
