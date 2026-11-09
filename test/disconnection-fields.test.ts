import assert from 'node:assert/strict';
import { Boom } from '@hapi/boom';
import { DisconnectReason } from 'baileys';

import { BaileysStartupService } from '../src/api/integrations/channel/whatsapp/whatsapp.baileys.service';

// Regression for #45: successful opens must clear all three fields, and
// subsequent terminal closes must restore diagnostic information.
async function main() {
  const previousClose = new Date('2026-10-11T10:00:00Z');
  const stored: Record<string, any> = {
    connectionStatus: 'close',
    disconnectionAt: previousClose,
    disconnectionReasonCode: 401,
    disconnectionObject: '{"previous":"loggedOut"}',
  };
  const socket: any = {
    user: { id: '123456:1@s.whatsapp.net' },
    ws: { close() {} },
    end() {},
  };
  const service: any = Object.create(BaileysStartupService.prototype);
  service.instance = { id: 'instance-1', name: 'field-test', qrcode: { count: 0 } };
  service.client = socket;
  service.stateConnection = { state: 'close' };
  service.configService = { get: (key: string) => key === 'CHATWOOT' ? { ENABLED: false } : {} };
  service.prismaRepository = { instance: {
    update: async ({ data }: any) => { Object.assign(stored, data); },
  } };
  service.localChatwoot = { enabled: false };
  service.eventEmitter = { emit() {} };
  service.logger = { info() {}, error() {}, warn() {} };
  service.stopOutboundQueueWorker = () => {};
  service.startOutboundQueueWorker = () => {};
  service.watchSocket = () => {};
  service.profilePicture = async () => ({ profilePictureUrl: null });
  service.getProfileName = async () => 'Test';
  service.sendDataWebhook = () => {};

  await service.connectionUpdate({ connection: 'open' }, socket);
  assert.equal(stored.connectionStatus, 'open');
  assert.equal(stored.disconnectionAt, null);
  assert.equal(stored.disconnectionReasonCode, null);
  assert.equal(stored.disconnectionObject, null);

  await service.connectionUpdate({
    connection: 'close',
    lastDisconnect: { error: new Boom('Logged out', { statusCode: DisconnectReason.loggedOut }) },
  }, socket);
  assert.equal(stored.connectionStatus, 'close');
  assert.ok(stored.disconnectionAt instanceof Date);
  assert.equal(stored.disconnectionReasonCode, DisconnectReason.loggedOut);
  assert.ok(stored.disconnectionObject, 'Terminal close must retain diagnostic information');

  await service.connectionUpdate({ connection: 'open' }, socket);
  assert.equal(stored.connectionStatus, 'open');
  assert.equal(stored.disconnectionAt, null);
  assert.equal(stored.disconnectionReasonCode, null);
  assert.equal(stored.disconnectionObject, null);
  console.log('Disconnection field reset tests passed');
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
