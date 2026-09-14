ALTER TABLE "OutboundMessageAudit" ADD COLUMN "recipientCategory" VARCHAR(20);

CREATE TABLE "RecipientEngagement" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "recipient" VARCHAR(100) NOT NULL,
  "firstInboundAt" TIMESTAMP,
  "lastInboundAt" TIMESTAMP,
  "firstOutboundAt" TIMESTAMP,
  "lastOutboundAt" TIMESTAMP,
  "lastOutreachAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  CONSTRAINT "RecipientEngagement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecipientEngagement_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RecipientEngagement_instanceId_recipient_key" ON "RecipientEngagement"("instanceId", "recipient");
CREATE INDEX "RecipientEngagement_instanceId_lastInboundAt_idx" ON "RecipientEngagement"("instanceId", "lastInboundAt");
CREATE INDEX "RecipientEngagement_instanceId_lastOutreachAt_idx" ON "RecipientEngagement"("instanceId", "lastOutreachAt");

INSERT INTO "RecipientEngagement" (
  "id", "instanceId", "recipient", "firstInboundAt", "lastInboundAt",
  "firstOutboundAt", "lastOutboundAt", "createdAt", "updatedAt"
)
SELECT
  md5("instanceId" || ':' || lower("key"->>'remoteJid')),
  "instanceId",
  lower("key"->>'remoteJid'),
  MIN(to_timestamp("messageTimestamp")) FILTER (WHERE COALESCE(("key"->>'fromMe')::boolean, false) = false),
  MAX(to_timestamp("messageTimestamp")) FILTER (WHERE COALESCE(("key"->>'fromMe')::boolean, false) = false),
  MIN(to_timestamp("messageTimestamp")) FILTER (WHERE COALESCE(("key"->>'fromMe')::boolean, false) = true),
  MAX(to_timestamp("messageTimestamp")) FILTER (WHERE COALESCE(("key"->>'fromMe')::boolean, false) = true),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Message"
WHERE "key"->>'remoteJid' ~* '@(s\.whatsapp\.net|lid)$'
GROUP BY "instanceId", lower("key"->>'remoteJid')
ON CONFLICT ("instanceId", "recipient") DO NOTHING;
