ALTER TABLE "Setting"
ADD COLUMN "automationSafety" JSONB;

CREATE TABLE "OutboundMessageAudit" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "recipient" VARCHAR(100) NOT NULL,
  "messageHash" VARCHAR(64),
  "messageType" VARCHAR(50) NOT NULL,
  "status" VARCHAR(30) NOT NULL,
  "reason" VARCHAR(100),
  "delayMs" INTEGER,
  "requestedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP,
  CONSTRAINT "OutboundMessageAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OutboundMessageAudit_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "OutboundMessageAudit_instanceId_requestedAt_idx" ON "OutboundMessageAudit"("instanceId", "requestedAt");
CREATE INDEX "OutboundMessageAudit_instanceId_recipient_requestedAt_idx" ON "OutboundMessageAudit"("instanceId", "recipient", "requestedAt");
CREATE INDEX "OutboundMessageAudit_instanceId_recipient_messageHash_requestedAt_idx" ON "OutboundMessageAudit"("instanceId", "recipient", "messageHash", "requestedAt");
