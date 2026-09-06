-- Multiple per-instance webhook destinations. The old Webhook table is retained
-- for backward compatibility and each configured row is copied into this table.
CREATE TABLE `WebhookEndpoint` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `headers` JSON NULL,
    `enabled` BOOLEAN NULL DEFAULT true,
    `events` JSON NULL,
    `webhookByEvents` BOOLEAN NULL DEFAULT false,
    `webhookBase64` BOOLEAN NULL DEFAULT false,
    `createdAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP NOT NULL,
    `instanceId` VARCHAR(191) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `WebhookEndpoint_instanceId_idx`(`instanceId`),
    CONSTRAINT `WebhookEndpoint_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `Instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `WebhookEndpoint` (`id`, `url`, `headers`, `enabled`, `events`, `webhookByEvents`, `webhookBase64`, `createdAt`, `updatedAt`, `instanceId`)
SELECT `id`, `url`, `headers`, `enabled`, `events`, `webhookByEvents`, `webhookBase64`, `createdAt`, `updatedAt`, `instanceId`
FROM `Webhook`;
