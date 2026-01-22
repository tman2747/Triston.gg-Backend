-- CreateTable
CREATE TABLE "SkyhookLedger" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalGas" BIGINT NOT NULL,
    "totalIsk" BIGINT NOT NULL,
    "corpTax" DOUBLE PRECISION NOT NULL,
    "corpGasAmount" BIGINT NOT NULL,
    "individualIsk" BIGINT NOT NULL,
    "individualGas" BIGINT NOT NULL,
    "paid" BOOLEAN NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "SkyhookLedger_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SkyhookLedger" ADD CONSTRAINT "SkyhookLedger_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET DEFAULT ON UPDATE CASCADE;
