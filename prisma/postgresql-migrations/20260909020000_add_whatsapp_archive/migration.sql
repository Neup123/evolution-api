CREATE TABLE "ArchiveAccount" (
  "id" TEXT NOT NULL,
  "instanceName" VARCHAR(255) NOT NULL,
  "ownerJid" VARCHAR(100),
  "lastSequence" BIGINT NOT NULL DEFAULT 0,
  "headHash" VARCHAR(64),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchiveAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ArchiveAccount_instanceName_key" ON "ArchiveAccount"("instanceName");

CREATE TABLE "ArchivePolicy" (
  "id" TEXT NOT NULL,
  "scope" VARCHAR(32) NOT NULL,
  "selector" JSONB NOT NULL,
  "policy" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "effectiveAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchivePolicy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArchivePolicy_scope_enabled_effectiveAt_idx" ON "ArchivePolicy"("scope", "enabled", "effectiveAt");

CREATE TABLE "ArchiveEvent" (
  "id" TEXT NOT NULL,
  "accountId" VARCHAR(36) NOT NULL,
  "instanceName" VARCHAR(255) NOT NULL,
  "sequence" BIGINT NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "entityType" VARCHAR(32) NOT NULL,
  "entityJid" VARCHAR(255),
  "messageId" VARCHAR(255),
  "occurredAt" TIMESTAMPTZ(6) NOT NULL,
  "capturedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projection" JSONB NOT NULL,
  "payloadCiphertext" BYTEA,
  "payloadIv" BYTEA,
  "payloadTag" BYTEA,
  "payloadHash" VARCHAR(64) NOT NULL,
  "previousHash" VARCHAR(64),
  "recordHash" VARCHAR(64) NOT NULL,
  "excluded" BOOLEAN NOT NULL DEFAULT false,
  "purgeJobId" VARCHAR(36),
  CONSTRAINT "ArchiveEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ArchiveEvent_accountId_sequence_key" ON "ArchiveEvent"("accountId", "sequence");
CREATE INDEX "ArchiveEvent_accountId_eventType_occurredAt_idx" ON "ArchiveEvent"("accountId", "eventType", "occurredAt");
CREATE INDEX "ArchiveEvent_accountId_entityJid_occurredAt_idx" ON "ArchiveEvent"("accountId", "entityJid", "occurredAt");
CREATE INDEX "ArchiveEvent_accountId_messageId_idx" ON "ArchiveEvent"("accountId", "messageId");

CREATE TABLE "ArchiveMedia" (
  "id" TEXT NOT NULL,
  "accountId" VARCHAR(36) NOT NULL,
  "eventId" VARCHAR(36) NOT NULL,
  "messageId" VARCHAR(255),
  "entityJid" VARCHAR(255),
  "mediaType" VARCHAR(32) NOT NULL,
  "mimeType" VARCHAR(255),
  "objectKey" VARCHAR(1024),
  "contentHash" VARCHAR(64),
  "sizeBytes" BIGINT,
  "state" VARCHAR(32) NOT NULL DEFAULT 'metadata_only',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "purgedAt" TIMESTAMPTZ(6),
  CONSTRAINT "ArchiveMedia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArchiveMedia_accountId_entityJid_createdAt_idx" ON "ArchiveMedia"("accountId", "entityJid", "createdAt");
CREATE INDEX "ArchiveMedia_eventId_idx" ON "ArchiveMedia"("eventId");

CREATE TABLE "ArchiveIdentityMapping" (
  "id" TEXT NOT NULL,
  "accountId" VARCHAR(36) NOT NULL,
  "pnJid" VARCHAR(255),
  "lidJid" VARCHAR(255),
  "sourceEvent" VARCHAR(36) NOT NULL,
  "validFrom" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTo" TIMESTAMPTZ(6),
  CONSTRAINT "ArchiveIdentityMapping_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArchiveIdentityMapping_accountId_pnJid_idx" ON "ArchiveIdentityMapping"("accountId", "pnJid");
CREATE INDEX "ArchiveIdentityMapping_accountId_lidJid_idx" ON "ArchiveIdentityMapping"("accountId", "lidJid");

CREATE TABLE "ArchivePurgePreview" (
  "id" TEXT NOT NULL,
  "accountId" VARCHAR(36) NOT NULL,
  "criteria" JSONB NOT NULL,
  "summary" JSONB NOT NULL,
  "confirmationHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchivePurgePreview_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ArchivePurgeJob" (
  "id" TEXT NOT NULL,
  "accountId" VARCHAR(36) NOT NULL,
  "previewId" VARCHAR(36) NOT NULL,
  "criteria" JSONB NOT NULL,
  "summary" JSONB NOT NULL,
  "status" VARCHAR(32) NOT NULL,
  "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(6),
  "error" TEXT,
  CONSTRAINT "ArchivePurgeJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ArchivePurgeJob_previewId_key" ON "ArchivePurgeJob"("previewId");
CREATE TABLE "ArchivePurgeTombstone" (
  "id" TEXT NOT NULL,
  "accountId" VARCHAR(36) NOT NULL,
  "purgeJobId" VARCHAR(36) NOT NULL,
  "criteriaHash" VARCHAR(64) NOT NULL,
  "deletedSummary" JSONB NOT NULL,
  "previousHash" VARCHAR(64),
  "tombstoneHash" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchivePurgeTombstone_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ArchivePurgeTombstone_purgeJobId_key" ON "ArchivePurgeTombstone"("purgeJobId");
CREATE TABLE "ArchiveAccessLog" (
  "id" TEXT NOT NULL,
  "accountId" VARCHAR(36),
  "operation" VARCHAR(100) NOT NULL,
  "scope" VARCHAR(100) NOT NULL,
  "actorHash" VARCHAR(64) NOT NULL,
  "parameters" JSONB NOT NULL,
  "result" VARCHAR(32) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchiveAccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArchiveAccessLog_accountId_createdAt_idx" ON "ArchiveAccessLog"("accountId", "createdAt");

COMMENT ON TABLE "ArchiveEvent" IS 'Append-only encrypted WhatsApp event ledger. Purges remove content and append ArchivePurgeTombstone records.';
COMMENT ON COLUMN "ArchivePolicy"."scope" IS 'One of general, entity, account, or jid; policy resolution applies the most specific enabled match.';

CREATE TABLE "ArchiveMessage" (
  "id" TEXT NOT NULL, "accountId" VARCHAR(36) NOT NULL, "waMessageId" VARCHAR(255) NOT NULL,
  "chatJid" VARCHAR(255) NOT NULL, "participantJid" VARCHAR(255), "fromMe" BOOLEAN,
  "messageType" VARCHAR(100), "sentAt" TIMESTAMPTZ(6) NOT NULL, "firstEventId" VARCHAR(36) NOT NULL,
  "latestRevision" INTEGER NOT NULL DEFAULT 1, "deletedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchiveMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ArchiveMessage_accountId_chatJid_waMessageId_key" ON "ArchiveMessage"("accountId", "chatJid", "waMessageId");
CREATE INDEX "ArchiveMessage_accountId_chatJid_sentAt_idx" ON "ArchiveMessage"("accountId", "chatJid", "sentAt");

CREATE TABLE "ArchiveMessageRevision" (
  "id" TEXT NOT NULL, "accountId" VARCHAR(36) NOT NULL, "archiveMessageId" VARCHAR(36) NOT NULL,
  "eventId" VARCHAR(36) NOT NULL, "revision" INTEGER NOT NULL, "projection" JSONB NOT NULL,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL, CONSTRAINT "ArchiveMessageRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ArchiveMessageRevision_archiveMessageId_revision_key" ON "ArchiveMessageRevision"("archiveMessageId", "revision");
CREATE INDEX "ArchiveMessageRevision_accountId_eventId_idx" ON "ArchiveMessageRevision"("accountId", "eventId");

CREATE TABLE "ArchiveReceipt" (
  "id" TEXT NOT NULL, "accountId" VARCHAR(36) NOT NULL, "eventId" VARCHAR(36) NOT NULL,
  "waMessageId" VARCHAR(255), "chatJid" VARCHAR(255), "participantJid" VARCHAR(255),
  "status" VARCHAR(64), "occurredAt" TIMESTAMPTZ(6) NOT NULL, CONSTRAINT "ArchiveReceipt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArchiveReceipt_accountId_waMessageId_occurredAt_idx" ON "ArchiveReceipt"("accountId", "waMessageId", "occurredAt");

CREATE TABLE "ArchiveReaction" (
  "id" TEXT NOT NULL, "accountId" VARCHAR(36) NOT NULL, "eventId" VARCHAR(36) NOT NULL,
  "waMessageId" VARCHAR(255), "chatJid" VARCHAR(255), "participantJid" VARCHAR(255),
  "reaction" VARCHAR(64), "removed" BOOLEAN NOT NULL DEFAULT false, "occurredAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ArchiveReaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArchiveReaction_accountId_waMessageId_occurredAt_idx" ON "ArchiveReaction"("accountId", "waMessageId", "occurredAt");

CREATE TABLE "ArchiveEntityRevision" (
  "id" TEXT NOT NULL, "accountId" VARCHAR(36) NOT NULL, "eventId" VARCHAR(36) NOT NULL,
  "entityType" VARCHAR(32) NOT NULL, "entityJid" VARCHAR(255) NOT NULL, "sequence" BIGINT NOT NULL,
  "projection" JSONB NOT NULL, "occurredAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ArchiveEntityRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ArchiveEntityRevision_accountId_entityType_entityJid_sequence_key" ON "ArchiveEntityRevision"("accountId", "entityType", "entityJid", "sequence");
CREATE INDEX "ArchiveEntityRevision_accountId_entityType_entityJid_occurredAt_idx" ON "ArchiveEntityRevision"("accountId", "entityType", "entityJid", "occurredAt");

CREATE TABLE "ArchiveGroupMembership" (
  "id" TEXT NOT NULL, "accountId" VARCHAR(36) NOT NULL, "groupJid" VARCHAR(255) NOT NULL,
  "participantJid" VARCHAR(255) NOT NULL, "role" VARCHAR(32), "state" VARCHAR(32) NOT NULL,
  "sourceEventId" VARCHAR(36) NOT NULL, "validFrom" TIMESTAMPTZ(6) NOT NULL, "validTo" TIMESTAMPTZ(6),
  CONSTRAINT "ArchiveGroupMembership_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArchiveGroupMembership_accountId_groupJid_participantJid_validFrom_idx" ON "ArchiveGroupMembership"("accountId", "groupJid", "participantJid", "validFrom");

CREATE TABLE "ArchiveCall" (
  "id" TEXT NOT NULL, "accountId" VARCHAR(36) NOT NULL, "eventId" VARCHAR(36) NOT NULL,
  "callId" VARCHAR(255), "peerJid" VARCHAR(255), "groupJid" VARCHAR(255), "status" VARCHAR(64),
  "video" BOOLEAN, "occurredAt" TIMESTAMPTZ(6) NOT NULL, CONSTRAINT "ArchiveCall_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArchiveCall_accountId_peerJid_occurredAt_idx" ON "ArchiveCall"("accountId", "peerJid", "occurredAt");

CREATE TABLE "ArchiveSyncGap" (
  "id" TEXT NOT NULL, "accountId" VARCHAR(36) NOT NULL, "sourceEvent" VARCHAR(36) NOT NULL,
  "entityJid" VARCHAR(255), "gapType" VARCHAR(64) NOT NULL, "rangeStart" TIMESTAMPTZ(6),
  "rangeEnd" TIMESTAMPTZ(6), "status" VARCHAR(32) NOT NULL, "details" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMPTZ(6),
  CONSTRAINT "ArchiveSyncGap_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ArchiveSyncGap_accountId_status_createdAt_idx" ON "ArchiveSyncGap"("accountId", "status", "createdAt");
