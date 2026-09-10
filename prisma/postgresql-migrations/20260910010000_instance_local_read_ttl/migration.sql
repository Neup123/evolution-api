ALTER TABLE "Setting"
ADD COLUMN "localReadTtlSeconds" INTEGER,
ADD COLUMN "localReadTtlOverrides" JSONB;

-- Rebuild group snapshots so participant identity fields use the v4.1 contract.
DELETE FROM "LocalReadSnapshot"
WHERE "method" IN ('groupMetadata', 'communityMetadata', 'groupFetchAllParticipating', 'communityFetchAllParticipating', 'communityFetchLinkedGroups');
