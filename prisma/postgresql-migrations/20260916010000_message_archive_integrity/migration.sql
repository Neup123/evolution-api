ALTER TABLE "Message"
  ADD COLUMN "waMessageId" VARCHAR(100),
  ADD COLUMN "remoteJid" VARCHAR(100),
  ADD COLUMN "remoteJidAlt" VARCHAR(100),
  ADD COLUMN "archiveOrigin" VARCHAR(30),
  ADD COLUMN "archiveState" VARCHAR(30),
  ADD COLUMN "serverAcceptedAt" TIMESTAMP,
  ADD COLUMN "deliveredAt" TIMESTAMP,
  ADD COLUMN "readAt" TIMESTAMP;

UPDATE "Message"
SET
  "remoteJid" = "key"->>'remoteJid',
  "remoteJidAlt" = NULLIF("key"->>'remoteJidAlt', "key"->>'remoteJid'),
  "archiveOrigin" = 'LEGACY',
  "archiveState" = CASE "status"
    WHEN 'SERVER_ACK' THEN 'SERVER_ACCEPTED'
    WHEN 'DELIVERY_ACK' THEN 'DELIVERED'
    WHEN 'READ' THEN 'READ'
    WHEN 'PLAYED' THEN 'PLAYED'
    WHEN 'PENDING' THEN 'PROVISIONAL'
    ELSE 'AUTHORITATIVE'
  END;

-- Only backfill the future idempotency key where the old archive has one row
-- for that WhatsApp ID. Historical duplicates remain readable and nullable.
WITH unique_messages AS (
  SELECT "instanceId", "key"->>'id' AS "waId"
  FROM "Message"
  WHERE "key"->>'id' IS NOT NULL
  GROUP BY "instanceId", "key"->>'id'
  HAVING COUNT(*) = 1
)
UPDATE "Message" message
SET "waMessageId" = unique_messages."waId"
FROM unique_messages
WHERE message."instanceId" = unique_messages."instanceId"
  AND message."key"->>'id' = unique_messages."waId";

-- Preserve a PN/LID acknowledgement address as alternate identity without
-- replacing the original address used to create the message.
WITH alternate_jids AS (
  SELECT update_row."messageId", MIN(update_row."remoteJid") AS "remoteJidAlt"
  FROM "MessageUpdate" update_row
  JOIN "Message" message ON message.id = update_row."messageId"
  WHERE update_row."remoteJid" IS DISTINCT FROM message."remoteJid"
  GROUP BY update_row."messageId"
)
UPDATE "Message" message
SET "remoteJidAlt" = alternate_jids."remoteJidAlt"
FROM alternate_jids
WHERE message.id = alternate_jids."messageId";

ALTER TABLE "Message"
  ALTER COLUMN "archiveOrigin" SET DEFAULT 'WHATSAPP_EVENT',
  ALTER COLUMN "archiveOrigin" SET NOT NULL,
  ALTER COLUMN "archiveState" SET DEFAULT 'AUTHORITATIVE',
  ALTER COLUMN "archiveState" SET NOT NULL;

CREATE UNIQUE INDEX "Message_instanceId_waMessageId_key" ON "Message"("instanceId", "waMessageId");
CREATE INDEX "Message_instanceId_remoteJid_idx" ON "Message"("instanceId", "remoteJid");
CREATE INDEX "Message_instanceId_remoteJidAlt_idx" ON "Message"("instanceId", "remoteJidAlt");

-- Repair the old helper's repeated domain. A literal "lid" marker was not an
-- identity, so retain a real cached LID when present and otherwise clear it.
UPDATE "IsOnWhatsapp"
SET
  "jidOptions" = REPLACE("jidOptions", '@s.whatsapp.net@s.whatsapp.net', '@s.whatsapp.net'),
  "lid" = COALESCE(
    NULLIF("lid", 'lid'),
    (REGEXP_MATCH("jidOptions", '(^|,)([0-9]+@lid)(,|$)'))[2]
  )
WHERE "jidOptions" LIKE '%@s.whatsapp.net@s.whatsapp.net%'
   OR "lid" = 'lid';

ALTER TABLE "MessageUpdate" ADD COLUMN "updateIdentity" VARCHAR(500);

WITH unique_updates AS (
  SELECT
    "instanceId",
    CONCAT("keyId", ':', "status", ':', "remoteJid", ':', COALESCE("participant", '')) AS identity
  FROM "MessageUpdate"
  GROUP BY
    "instanceId",
    CONCAT("keyId", ':', "status", ':', "remoteJid", ':', COALESCE("participant", ''))
  HAVING COUNT(*) = 1
)
UPDATE "MessageUpdate" update_row
SET "updateIdentity" = unique_updates.identity
FROM unique_updates
WHERE update_row."instanceId" = unique_updates."instanceId"
  AND CONCAT(
    update_row."keyId",
    ':',
    update_row."status",
    ':',
    update_row."remoteJid",
    ':',
    COALESCE(update_row."participant", '')
  ) = unique_updates.identity;

CREATE UNIQUE INDEX "MessageUpdate_instanceId_updateIdentity_key"
  ON "MessageUpdate"("instanceId", "updateIdentity");
