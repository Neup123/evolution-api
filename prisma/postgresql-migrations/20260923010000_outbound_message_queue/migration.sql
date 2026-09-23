CREATE TABLE "OutboundMessageQueue" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "recipient" VARCHAR(100) NOT NULL,
  "payload" JSONB NOT NULL,
  "settingsTemplateId" VARCHAR(100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  "reason" VARCHAR(100),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "scheduledAt" TIMESTAMP NOT NULL,
  "requestedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP,
  "lastError" TEXT,
  "updatedAt" TIMESTAMP NOT NULL,
  CONSTRAINT "OutboundMessageQueue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OutboundMessageQueue_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "OutboundMessageQueue_instanceId_status_scheduledAt_idx"
  ON "OutboundMessageQueue"("instanceId", "status", "scheduledAt");
CREATE INDEX "OutboundMessageQueue_instanceId_recipient_status_idx"
  ON "OutboundMessageQueue"("instanceId", "recipient", "status");
