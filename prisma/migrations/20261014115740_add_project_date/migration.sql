-- Projects get an editable "date" that the automatic "newest first" order uses, so a project
-- added late can be back-dated. Written by hand so existing projects start with their real
-- createdAt instead of all getting "now" (which would scramble the current order).

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- existing projects keep the order they have now
UPDATE "Project" SET "date" = "createdAt";
