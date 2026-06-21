-- Run this if users already exist with invalid password hashes.
-- Sets all demo users to password: Password@123

USE tms_db;

UPDATE users
SET password_hash = '$2b$12$6fmOrWqxP1rwW1Gv0D1t3ONwEcIQaBjf64.yyqtYsn8gkL2NhHViS',
    is_first_login = FALSE
WHERE email IN (
  'yasith@tms.com',
  'sarah.j@tms.com',
  'michael.c@tms.com',
  'emily.r@tms.com',
  'david.k@tms.com',
  'aisha.p@tms.com',
  'james.o@tms.com'
);
