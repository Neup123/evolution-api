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
    assert.equal(preview.summary.events, 2);
    const purged = await service.confirmPurge(preview.previewId, preview.confirmationToken);
    assert.equal(purged.summary.events, 2);
    assert.equal(purged.summary.media, 0);
    const verification = await service.verify('archive-test');
    assert.equal(verification.valid, true);
    assert.equal(verification.checkedTombstones, 1);
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
