-- Existing IsOnWhatsapp rows were global and cannot be assigned safely to an instance.
DROP TABLE IF EXISTS `IsOnWhatsapp`;

CREATE TABLE `IsOnWhatsapp` (
  `id` VARCHAR(191) NOT NULL,
  `remoteJid` VARCHAR(100) NOT NULL,
  `jidOptions` TEXT NOT NULL,
  `lid` VARCHAR(100) NULL,
  `exists` BOOLEAN NOT NULL DEFAULT true,
  `verifiedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL,
  `instanceId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `IsOnWhatsapp_instanceId_remoteJid_key` (`instanceId`, `remoteJid`),
  INDEX `IsOnWhatsapp_instanceId_idx` (`instanceId`),
  CONSTRAINT `IsOnWhatsapp_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `Instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LocalReadSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `method` VARCHAR(100) NOT NULL,
  `argumentsKey` VARCHAR(64) NOT NULL,
  `result` JSON NOT NULL,
  `complete` BOOLEAN NOT NULL DEFAULT true,
  `fetchedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL,
  `instanceId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `LocalReadSnapshot_instanceId_method_argumentsKey_key` (`instanceId`, `method`, `argumentsKey`),
  INDEX `LocalReadSnapshot_instanceId_method_idx` (`instanceId`, `method`),
  CONSTRAINT `LocalReadSnapshot_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `Instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
