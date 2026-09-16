ALTER TABLE `Message`
  ADD COLUMN `waMessageId` VARCHAR(100) NULL,
  ADD COLUMN `remoteJid` VARCHAR(100) NULL,
  ADD COLUMN `remoteJidAlt` VARCHAR(100) NULL,
  ADD COLUMN `archiveOrigin` VARCHAR(30) NULL,
  ADD COLUMN `archiveState` VARCHAR(30) NULL,
  ADD COLUMN `serverAcceptedAt` TIMESTAMP NULL,
  ADD COLUMN `deliveredAt` TIMESTAMP NULL,
  ADD COLUMN `readAt` TIMESTAMP NULL;

UPDATE `Message`
SET
  `remoteJid` = JSON_UNQUOTE(JSON_EXTRACT(`key`, '$.remoteJid')),
  `remoteJidAlt` = NULLIF(
    JSON_UNQUOTE(JSON_EXTRACT(`key`, '$.remoteJidAlt')),
    JSON_UNQUOTE(JSON_EXTRACT(`key`, '$.remoteJid'))
  ),
  `archiveOrigin` = 'LEGACY',
  `archiveState` = CASE `status`
    WHEN 'SERVER_ACK' THEN 'SERVER_ACCEPTED'
    WHEN 'DELIVERY_ACK' THEN 'DELIVERED'
    WHEN 'READ' THEN 'READ'
    WHEN 'PLAYED' THEN 'PLAYED'
    WHEN 'PENDING' THEN 'PROVISIONAL'
    ELSE 'AUTHORITATIVE'
  END;

UPDATE `Message` message
JOIN (
  SELECT
    `instanceId`,
    JSON_UNQUOTE(JSON_EXTRACT(`key`, '$.id')) AS wa_id
  FROM `Message`
  WHERE JSON_UNQUOTE(JSON_EXTRACT(`key`, '$.id')) IS NOT NULL
  GROUP BY `instanceId`, JSON_UNQUOTE(JSON_EXTRACT(`key`, '$.id'))
  HAVING COUNT(*) = 1
) unique_messages
  ON unique_messages.`instanceId` = message.`instanceId`
  AND unique_messages.wa_id = JSON_UNQUOTE(JSON_EXTRACT(message.`key`, '$.id'))
SET message.`waMessageId` = unique_messages.wa_id;

UPDATE `Message` message
JOIN (
  SELECT update_row.`messageId`, MIN(update_row.`remoteJid`) AS remote_jid_alt
  FROM `MessageUpdate` update_row
  JOIN `Message` source_message ON source_message.`id` = update_row.`messageId`
  WHERE NOT (update_row.`remoteJid` <=> source_message.`remoteJid`)
  GROUP BY update_row.`messageId`
) alternate_jids ON alternate_jids.`messageId` = message.`id`
SET message.`remoteJidAlt` = alternate_jids.remote_jid_alt;

ALTER TABLE `Message`
  MODIFY `archiveOrigin` VARCHAR(30) NOT NULL DEFAULT 'WHATSAPP_EVENT',
  MODIFY `archiveState` VARCHAR(30) NOT NULL DEFAULT 'AUTHORITATIVE';

CREATE UNIQUE INDEX `Message_instanceId_waMessageId_key` ON `Message`(`instanceId`, `waMessageId`);
CREATE INDEX `Message_instanceId_remoteJid_idx` ON `Message`(`instanceId`, `remoteJid`);
CREATE INDEX `Message_instanceId_remoteJidAlt_idx` ON `Message`(`instanceId`, `remoteJidAlt`);

UPDATE `IsOnWhatsapp`
SET
  `jidOptions` = REPLACE(`jidOptions`, '@s.whatsapp.net@s.whatsapp.net', '@s.whatsapp.net'),
  `lid` = COALESCE(NULLIF(`lid`, 'lid'), REGEXP_SUBSTR(`jidOptions`, '[0-9]+@lid'))
WHERE `jidOptions` LIKE '%@s.whatsapp.net@s.whatsapp.net%'
   OR `lid` = 'lid';

ALTER TABLE `MessageUpdate` ADD COLUMN `updateIdentity` VARCHAR(500) NULL;

UPDATE `MessageUpdate` update_row
JOIN (
  SELECT
    `instanceId`,
    CONCAT(`keyId`, ':', `status`, ':', `remoteJid`, ':', COALESCE(`participant`, '')) AS identity
  FROM `MessageUpdate`
  GROUP BY
    `instanceId`,
    CONCAT(`keyId`, ':', `status`, ':', `remoteJid`, ':', COALESCE(`participant`, ''))
  HAVING COUNT(*) = 1
) unique_updates
  ON unique_updates.`instanceId` = update_row.`instanceId`
  AND unique_updates.identity = CONCAT(
    update_row.`keyId`,
    ':',
    update_row.`status`,
    ':',
    update_row.`remoteJid`,
    ':',
    COALESCE(update_row.`participant`, '')
  )
SET update_row.`updateIdentity` = unique_updates.identity;

CREATE UNIQUE INDEX `MessageUpdate_instanceId_updateIdentity_key`
  ON `MessageUpdate`(`instanceId`, `updateIdentity`);
