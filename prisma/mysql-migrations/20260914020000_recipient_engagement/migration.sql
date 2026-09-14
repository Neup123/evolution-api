ALTER TABLE `OutboundMessageAudit` ADD COLUMN `recipientCategory` VARCHAR(20) NULL;

CREATE TABLE `RecipientEngagement` (
  `id` VARCHAR(191) NOT NULL,
  `instanceId` VARCHAR(191) NOT NULL,
  `recipient` VARCHAR(100) NOT NULL,
  `firstInboundAt` DATETIME(3) NULL,
  `lastInboundAt` DATETIME(3) NULL,
  `firstOutboundAt` DATETIME(3) NULL,
  `lastOutboundAt` DATETIME(3) NULL,
  `lastOutreachAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `RecipientEngagement_instanceId_recipient_key` (`instanceId`, `recipient`),
  INDEX `RecipientEngagement_instanceId_lastInboundAt_idx` (`instanceId`, `lastInboundAt`),
  INDEX `RecipientEngagement_instanceId_lastOutreachAt_idx` (`instanceId`, `lastOutreachAt`),
  CONSTRAINT `RecipientEngagement_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `Instance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `RecipientEngagement` (`id`, `instanceId`, `recipient`, `firstInboundAt`, `lastInboundAt`, `firstOutboundAt`, `lastOutboundAt`, `createdAt`, `updatedAt`)
SELECT MD5(CONCAT(`instanceId`, ':', JSON_UNQUOTE(JSON_EXTRACT(`key`, '$.remoteJid')))), `instanceId`, LOWER(JSON_UNQUOTE(JSON_EXTRACT(`key`, '$.remoteJid'))),
  MIN(CASE WHEN COALESCE(JSON_EXTRACT(`key`, '$.fromMe'), false) = false THEN FROM_UNIXTIME(`messageTimestamp`) END),
  MAX(CASE WHEN COALESCE(JSON_EXTRACT(`key`, '$.fromMe'), false) = false THEN FROM_UNIXTIME(`messageTimestamp`) END),
  MIN(CASE WHEN COALESCE(JSON_EXTRACT(`key`, '$.fromMe'), false) = true THEN FROM_UNIXTIME(`messageTimestamp`) END),
  MAX(CASE WHEN COALESCE(JSON_EXTRACT(`key`, '$.fromMe'), false) = true THEN FROM_UNIXTIME(`messageTimestamp`) END),
  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Message`
WHERE JSON_UNQUOTE(JSON_EXTRACT(`key`, '$.remoteJid')) REGEXP '@(s\\.whatsapp\\.net|lid)$'
GROUP BY `instanceId`, LOWER(JSON_UNQUOTE(JSON_EXTRACT(`key`, '$.remoteJid')));
