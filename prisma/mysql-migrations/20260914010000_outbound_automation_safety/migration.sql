ALTER TABLE `Setting`
ADD COLUMN `automationSafety` JSON NULL;

CREATE TABLE `OutboundMessageAudit` (
  `id` VARCHAR(191) NOT NULL,
  `instanceId` VARCHAR(191) NOT NULL,
  `recipient` VARCHAR(100) NOT NULL,
  `messageHash` VARCHAR(64) NULL,
  `messageType` VARCHAR(50) NOT NULL,
  `status` VARCHAR(30) NOT NULL,
  `reason` VARCHAR(100) NULL,
  `delayMs` INTEGER NULL,
  `requestedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sentAt` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  INDEX `OutboundMessageAudit_instanceId_requestedAt_idx` (`instanceId`, `requestedAt`),
  INDEX `OutboundMessageAudit_instanceId_recipient_requestedAt_idx` (`instanceId`, `recipient`, `requestedAt`),
  INDEX `OutboundAudit_instance_recipient_hash_requested_idx` (`instanceId`, `recipient`, `messageHash`, `requestedAt`),
  CONSTRAINT `OutboundMessageAudit_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `Instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
