-- Project categories move from a fixed enum to their own table so they can be added and
-- deleted from the site. Written by hand (not prisma's generated version) so every existing
-- project keeps its category instead of the column just being dropped.

-- CreateTable
CREATE TABLE "ProjectCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCategory_name_key" ON "ProjectCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCategory_slug_key" ON "ProjectCategory"("slug");

-- the old fixed categories become normal rows ("Other" can't be deleted on the site)
INSERT INTO "ProjectCategory" ("id", "name", "slug") VALUES
    (gen_random_uuid()::text, 'Web projects', 'web-projects'),
    (gen_random_uuid()::text, 'Games', 'games'),
    (gen_random_uuid()::text, 'Steam mods', 'steam-mods'),
    (gen_random_uuid()::text, 'Servers', 'servers'),
    (gen_random_uuid()::text, 'Tools', 'tools'),
    (gen_random_uuid()::text, 'Other', 'other');

-- AlterTable: add the new columns, categoryId starts out optional so it can be filled in
ALTER TABLE "Project" ADD COLUMN "categoryId" TEXT,
ADD COLUMN     "isServer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkLabel" TEXT;

-- every project keeps its category, and old SERVER projects keep their server features
UPDATE "Project" AS p
SET "categoryId" = c."id",
    "isServer" = (p."type" = 'SERVER')
FROM "ProjectCategory" AS c
WHERE c."slug" = CASE p."type"
    WHEN 'WEB' THEN 'web-projects'
    WHEN 'GAME' THEN 'games'
    WHEN 'MOD' THEN 'steam-mods'
    WHEN 'SERVER' THEN 'servers'
    WHEN 'TOOL' THEN 'tools'
    ELSE 'other'
END;

-- now every project has one, make it required and drop the old enum column
ALTER TABLE "Project" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Project" DROP COLUMN "type";

-- DropEnum
DROP TYPE "ProjectType";

-- CreateIndex
CREATE INDEX "Project_categoryId_idx" ON "Project"("categoryId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProjectCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
