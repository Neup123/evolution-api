import assert from 'node:assert/strict';

import { PrismaRepository } from '../src/api/repository/repository.service';
import { ArchiveService } from '../src/api/services/archive.service';
import { ConfigService } from '../src/config/env.config';

async function run() {
  const config = new ConfigService();
  const repository = new PrismaRepository(config);
  await repository.$connect();
  try {
    await repository.archiveAccessLog.deleteMany();
    await repository.archivePurgeTombstone.deleteMany();
    await repository.archivePurgeJob.deleteMany();
    await repository.archivePurgePreview.deleteMany();
    await repository.archiveMedia.deleteMany();
    await repository.archiveMessageRevision.deleteMany();
    await repository.archiveReceipt.deleteMany();
    await repository.archiveReaction.deleteMany();
    await repository.archiveMessage.deleteMany();
    await repository.archiveEntityRevision.deleteMany();
    await repository.archiveGroupMembership.deleteMany();
    await repository.archiveCall.deleteMany();
    await repository.archiveSyncGap.deleteMany();
    await repository.archiveIdentityMapping.deleteMany();
    await repository.archiveEvent.deleteMany();
    await repository.archivePolicy.deleteMany();
    await repository.archiveAccount.deleteMany();

    const service = new ArchiveService(repository, config);
    assert.equal(service.isEnabled(), true);
    await service.authorize('archive-test-key', 'archive:read');
    await assert.rejects(service.authorize('wrong', 'archive:read'));

    const message = {
      key: { id: 'message-1', remoteJid: '120363000000000000@g.us', fromMe: false },
      messageTimestamp: 1_788_960_000,
      pushName: 'Example',
      message: { conversation: 'durable hello' },
    };
    await service.capture({ instanceName: 'archive-test', event: 'messages.upsert', data: message });
    const events = await service.listEvents('archive-test', { entityJid: message.key.remoteJid }, true);
    assert.equal(events.length, 1);
    assert.equal(events[0].projection['text'], 'durable hello');
    assert.equal(events[0].payload['key']['id'], 'message-1');
    assert.equal(events[0].sequence, '1');

    const imageMessage = {
      ...message,
      key: { ...message.key, id: 'image-1' },
      message: {
        imageMessage: {
          mimetype: 'image/jpeg',
          fileLength: '2048',
          fileSha256: 'synthetic-image-digest',
        },
      },
    };
    await service.capture({ instanceName: 'archive-test', event: 'messages.upsert', data: imageMessage });
    const capturedMedia = await service.listMedia('archive-test', { groupJid: message.key.remoteJid });
    assert.equal(capturedMedia.length, 1);
    assert.equal(capturedMedia[0].mediaType, 'image');
    assert.equal(capturedMedia[0].mimeType, 'image/jpeg');
    assert.equal(capturedMedia[0].sizeBytes, '2048');
    assert.equal(capturedMedia[0].state, 'metadata_only');

    await service.putPolicy({
      scope: 'jid',
      selector: { instanceName: 'archive-test', jid: message.key.remoteJid },
      policy: { capture: { messages: false } },
    });
    await service.capture({ instanceName: 'archive-test', event: 'messages.update', data: { ...message, status: 'READ' } });
    const excluded = await service.listEvents('archive-test', { eventType: 'messages.update' }, true);
    assert.equal(excluded[0].excluded, true);
    assert.equal(excluded[0].payload, undefined);

    const preview = await service.previewPurge('archive-test', { groupJid: message.key.remoteJid });
    assert.equal(preview.summary.events, 3);
    assert.equal(preview.summary.media, 1);
    const purged = await service.confirmPurge(preview.previewId, preview.confirmationToken);
    assert.equal(purged.summary.events, 3);
    assert.equal(purged.summary.media, 1);
    const verification = await service.verify('archive-test');
    assert.equal(verification.valid, true);
    assert.equal(verification.checkedTombstones, 1);

    await service.putPolicy({
      scope: 'jid',
      selector: { instanceName: 'archive-test', jid: message.key.remoteJid },
      policy: { capture: { messages: true }, media: { mode: 'images' } },
    });
    await service.capture({
      instanceName: 'archive-test',
      event: 'messages.upsert',
      data: { ...imageMessage, key: { ...imageMessage.key, id: 'image-2' } },
    });
    const mediaOnlyPreview = await service.previewPurge('archive-test', {
      groupJid: message.key.remoteJid,
      mediaOnly: true,
    });
    assert.equal(mediaOnlyPreview.summary.events, 0);
    assert.equal(mediaOnlyPreview.summary.media, 1);
    const mediaOnlyPurge = await service.confirmPurge(
      mediaOnlyPreview.previewId,
      mediaOnlyPreview.confirmationToken,
    );
    assert.equal(mediaOnlyPurge.summary.events, 0);
    assert.equal(mediaOnlyPurge.summary.media, 1);
    assert.equal((await service.listMedia('archive-test', { groupJid: message.key.remoteJid })).length, 0);
    const mediaOnlyVerification = await service.verify('archive-test');
    assert.equal(mediaOnlyVerification.valid, true, JSON.stringify(mediaOnlyVerification));

    await service.capture({
      instanceName: 'archive-test',
      event: 'messages.upsert',
      data: { ...message, key: { ...message.key, id: 'message-2' } },
    });
    const tail = await repository.archiveEvent.findFirst({
      where: { instanceName: 'archive-test' },
      orderBy: { sequence: 'desc' },
    });
    await repository.archiveEvent.delete({ where: { id: tail!.id } });
    const tampered = await service.verify('archive-test');
    assert.equal(tampered.valid, false);
    console.log('Archive capture, encryption, policy, purge, tamper detection, and integrity tests passed.');
  } finally {
    await repository.$disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
