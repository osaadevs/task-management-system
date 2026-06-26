// Mirrors the backend PASSWORD_REGEX (utils/errors.js): lower + upper + digit +
// symbol, min length 8. Keep these in sync so the client never accepts a password
// the server will reject.
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
export const PASSWORD_HINT = 'Use 8+ characters with upper, lower, a number, and a symbol.';

export function passwordError(value) {
  if (!value) return '';
  return PASSWORD_REGEX.test(value) ? '' : PASSWORD_HINT;
}
