-- Run in Supabase SQL Editor if demo accounts are locked after failed forgot-password emails.
-- Restores Password@123 for these accounts (same hash as prisma/seed.js).

UPDATE users
SET
  password_hash = '$2b$12$6fmOrWqxP1rwW1Gv0D1t3ONwEcIQaBjf64.yyqtYsn8gkL2NhHViS',
  is_first_login = FALSE,
  is_active = TRUE
WHERE email IN (
  'thaveeshaweerasinghe2004@gmail.com',
  'sarah.j@tms.com',
  'yasith@tms.com',
  'emily.r@tms.com'
);
