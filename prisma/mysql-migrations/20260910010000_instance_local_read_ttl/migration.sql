ALTER TABLE `Setting`
ADD COLUMN `localReadTtlSeconds` INTEGER NULL,
ADD COLUMN `localReadTtlOverrides` JSON NULL;

DELETE FROM `LocalReadSnapshot`
WHERE `method` IN ('groupMetadata', 'communityMetadata', 'groupFetchAllParticipating', 'communityFetchAllParticipating', 'communityFetchLinkedGroups');
