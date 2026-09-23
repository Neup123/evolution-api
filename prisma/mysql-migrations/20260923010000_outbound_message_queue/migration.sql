CREATE TABLE `OutboundMessageQueue` (
  `id` VARCHAR(191) NOT NULL,
  `instanceId` VARCHAR(191) NOT NULL,
  `recipient` VARCHAR(100) NOT NULL,
  `payload` JSON NOT NULL,
  `settingsTemplateId` VARCHAR(100) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  `reason` VARCHAR(100) NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `scheduledAt` DATETIME(3) NOT NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lockedAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `OutboundMessageQueue_instanceId_status_scheduledAt_idx` (`instanceId`, `status`, `scheduledAt`),
  INDEX `OutboundMessageQueue_instanceId_recipient_status_idx` (`instanceId`, `recipient`, `status`),
  CONSTRAINT `OutboundMessageQueue_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `Instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
