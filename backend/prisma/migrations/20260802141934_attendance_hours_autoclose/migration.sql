-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "autoClosed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalHours" DECIMAL(65,30);

