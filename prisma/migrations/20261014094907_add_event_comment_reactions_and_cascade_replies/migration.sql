-- DropForeignKey
ALTER TABLE "EventComment" DROP CONSTRAINT "EventComment_parentId_fkey";

-- CreateTable
CREATE TABLE "EventCommentReaction" (
    "id" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventCommentReaction_userId_idx" ON "EventCommentReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventCommentReaction_commentId_userId_key" ON "EventCommentReaction"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "EventCommentReaction" ADD CONSTRAINT "EventCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "EventComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCommentReaction" ADD CONSTRAINT "EventCommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventComment" ADD CONSTRAINT "EventComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EventComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

