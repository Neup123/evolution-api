ALTER TABLE "OutboundMessageAudit"
ADD COLUMN IF NOT EXISTS "messageFingerprint" VARCHAR(16);
