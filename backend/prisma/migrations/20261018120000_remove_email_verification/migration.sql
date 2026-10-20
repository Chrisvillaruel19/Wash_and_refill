-- Email verification was removed: Forgot Password now sends reset links to
-- any active account's email, so these leftovers are no longer used.

-- Outstanding/used verification links can't survive the enum change.
DELETE FROM "Token" WHERE "type" = 'VERIFY_EMAIL';

-- AlterEnum
BEGIN;
CREATE TYPE "TokenType_new" AS ENUM ('REFRESH', 'RESET_PASSWORD', 'RESTOCK_AUTHORIZATION');
ALTER TABLE "Token" ALTER COLUMN "type" TYPE "TokenType_new" USING ("type"::text::"TokenType_new");
ALTER TYPE "TokenType" RENAME TO "TokenType_old";
ALTER TYPE "TokenType_new" RENAME TO "TokenType";
DROP TYPE "public"."TokenType_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerifiedAt";
