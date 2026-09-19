CREATE TABLE `SettingsTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `settings` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SettingsTemplate_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `SettingsTemplateBinding` (
  `id` VARCHAR(191) NOT NULL,
  `instanceId` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NOT NULL,
  `scope` VARCHAR(20) NOT NULL,
  `target` VARCHAR(255) NOT NULL DEFAULT '',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SettingsTemplateBinding_instanceId_scope_target_key`(`instanceId`, `scope`, `target`),
  INDEX `SettingsTemplateBinding_templateId_idx`(`templateId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SettingsTemplateBinding_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `Instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SettingsTemplateBinding_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `SettingsTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
