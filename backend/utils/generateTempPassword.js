const crypto = require('crypto');

// Ambiguous-looking characters (0/O/1/l/I) omitted so emailed temp passwords are
// easy to transcribe.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pick(set) {
  return set[crypto.randomInt(set.length)];
}

// BE-11: cryptographically-secure temp password (crypto.randomInt, no fixed
// 'Aa1' prefix). Guarantees at least one upper, lower, and digit so it always
// satisfies PASSWORD_REGEX, then shuffles so positions aren't predictable.
function generateTempPassword(length = 16) {
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const chars = [...required];
  for (let i = chars.length; i < length; i += 1) {
    chars.push(pick(ALL));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = generateTempPassword;
