-- Multiple per-instance webhook destinations. The legacy Webhook row remains in
-- place so existing clients and configurations continue to work unchanged.
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "headers" JSONB,
    "enabled" BOOLEAN DEFAULT true,
    "events" JSONB,
    "webhookByEvents" BOOLEAN DEFAULT false,
    "webhookBase64" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "instanceId" TEXT NOT NULL,
    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- Reuse the legacy row ID so this migration is deterministic and idempotent for
-- configured instances. New destinations receive a fresh Prisma CUID.
INSERT INTO "WebhookEndpoint" ("id", "url", "headers", "enabled", "events", "webhookByEvents", "webhookBase64", "createdAt", "updatedAt", "instanceId")
SELECT "id", "url", "headers", "enabled", "events", "webhookByEvents", "webhookBase64", "createdAt", "updatedAt", "instanceId"
FROM "Webhook";

CREATE INDEX "WebhookEndpoint_instanceId_idx" ON "WebhookEndpoint"("instanceId");
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_instanceId_fkey"
  FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
