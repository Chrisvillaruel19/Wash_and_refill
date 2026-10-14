-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- Evidence-based backfill for accounts that already exist (new accounts
-- always start unverified). An existing account counts as verified ONLY if:
--   1. it COMPLETED an emailed password reset — a RESET_PASSWORD token was
--      actually used (consumedAt set), which is only possible by opening the
--      link sent to the account's email (merely requesting a reset is not
--      evidence); and
--   2. no audited Employee update set the account's CURRENT email after that
--      reset (Edit Employee is the only code path that changes an email, and
--      it records old/new email in the audit log).
-- Every other existing account stays NULL (unverified). Login never depends
-- on this column; unverified users can still sign in and verify any time,
-- and Forgot Password sends them a verification link instead of a reset link.
UPDATE "User" u
SET "emailVerifiedAt" = r."lastReset"
FROM (
  SELECT "userId", MAX("consumedAt") AS "lastReset"
  FROM "Token"
  WHERE "type" = 'RESET_PASSWORD' AND "consumedAt" IS NOT NULL
  GROUP BY "userId"
) r
WHERE u."id" = r."userId"
  AND NOT EXISTS (
    SELECT 1
    FROM "AuditLog" a
    WHERE a."module" = 'Employee'
      AND a."action" = 'UPDATE'
      AND a."createdAt" > r."lastReset"
      AND lower(a."newValue"->>'email') = lower(u."email")
      AND lower(COALESCE(a."oldValue"->>'email', '')) <> lower(u."email")
  );
