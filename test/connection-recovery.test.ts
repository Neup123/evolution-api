import assert from 'node:assert/strict';
import { Boom } from '@hapi/boom';
import { DisconnectReason } from 'baileys';

import { BaileysStartupService } from '../src/api/integrations/channel/whatsapp/whatsapp.baileys.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(predicate: () => boolean, message: string) {
  const deadline = Date.now() + 1_500;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(message);
    await sleep(5);
  }
}

function harness() {
  const stored: Record<string, any> = {
    connectionStatus: 'open',
    disconnectionAt: null,
    disconnectionReasonCode: null,
    disconnectionObject: null,
  };
  const logs: string[] = [];
  const socket: any = {
    user: { id: '12345:1@s.whatsapp.net' },
    ws: { close() {} },
    end() {},
  };
  // Do not construct the full server; exercise the actual connectionUpdate,
  // status persistence and retry methods with controlled collaborators.
  const service: any = Object.create(BaileysStartupService.prototype);
  service.instance = { id: 'instance-1', name: 'test', qrcode: { count: 0 } };
  service.instance.authState = { state: { creds: { registered: true } } };
  service.client = socket;
  service.stateConnection = { state: 'open' };
  service.connectionRevision = 0;
  service.socketBuildRevision = 0;
  service.statusWriteQueue = Promise.resolve();
  service.reconnectBackoffBaseMs = 5;
  service.reconnectAttemptTimeoutMs = 40;
  service.reconnectAttempts = 0;
  service.reconnectInFlight = false;
  service.logger = {
    info: (message: unknown) => logs.push(String(message)),
    warn: (message: unknown) => logs.push(String(message)),
    error: (message: unknown) => logs.push(String(message)),
  };
  service.configService = { get: (key: string) => key === 'CHATWOOT' ? { ENABLED: false } : {} };
  service.prismaRepository = {
    instance: {
      update: async ({ data }: any) => {
        Object.assign(stored, data);
      },
    },
  };
  service.localChatwoot = { enabled: false };
  service.eventEmitter = { emit() {} };
  service.stopOutboundQueueWorker = () => {};
  service.startOutboundQueueWorker = () => {};
  service.watchSocket = () => {};
  service.profilePicture = async () => ({ profilePictureUrl: null });
  service.getProfileName = async () => 'Test';
  service.sendDataWebhook = () => {};
  return { service, socket, stored, logs };
}

function transientClose() {
  return { connection: 'close' as const, lastDisconnect: {
    error: new Boom('Lost connection', { statusCode: DisconnectReason.connectionLost }),
  } };
}

async function failedReconnectThenOpen() {
  const { service, socket, stored, logs } = harness();
  let attempts = 0;
  let statusAtRecoveryAttempt: string | undefined;
  service.connectToWhatsapp = async () => {
    service.activeSocketBuildRevision = ++service.socketBuildRevision;
    attempts++;
    if (attempts === 1) throw new Error('Simulated reconnect failure');
    // Snapshot the state *before* the retry opens. Full jitter can make the
    // second attempt complete before a polling assertion after attempt one.
    statusAtRecoveryAttempt = stored.connectionStatus;
    queueMicrotask(() => { void service.connectionUpdate({ connection: 'open' }, socket); });
    return socket;
  };

  await service.connectionUpdate(transientClose(), socket);
  assert.equal(stored.connectionStatus, 'close', 'fetchInstances must not report open after transient close');
  await until(() => stored.connectionStatus === 'open', 'A subsequent attempt did not recover');
  assert.ok(attempts >= 2);
  assert.equal(statusAtRecoveryAttempt, 'close', 'Failed first attempt must leave a non-open stored state');
  assert.ok(logs.some((line) => line.includes('outcome=threw')));
  assert.ok(logs.some((line) => line.includes('outcome=opened')));
}

async function hangingReconnectThenOpen() {
  const { service, socket, stored, logs } = harness();
  let attempts = 0;
  let statusAtRecoveryAttempt: string | undefined;
  service.connectToWhatsapp = () => {
    service.activeSocketBuildRevision = ++service.socketBuildRevision;
    attempts++;
    if (attempts === 1) return new Promise(() => {});
    // Check the state after the timed-out attempt, independent of retry jitter.
    statusAtRecoveryAttempt = stored.connectionStatus;
    queueMicrotask(() => { void service.connectionUpdate({ connection: 'open' }, socket); });
    return Promise.resolve(socket);
  };
  await service.connectionUpdate(transientClose(), socket);
  await until(() => stored.connectionStatus === 'open', 'A hung reconnect did not time out and recover');
  assert.ok(attempts >= 2);
  assert.equal(statusAtRecoveryAttempt, 'close', 'Timed-out first attempt must leave a non-open stored state');
  assert.ok(logs.some((line) => line.includes('outcome=timed_out')));
}

async function delayedOpenCannotOverwriteClose() {
  const { service, socket, stored } = harness();
  let releasePicture!: (picture: { profilePictureUrl: null }) => void;
  service.profilePicture = () => new Promise((resolve) => { releasePicture = resolve; });
  service.scheduleReconnect = () => {};

  const oldOpen = service.connectionUpdate({ connection: 'open' }, socket);
  await sleep(0);
  await service.connectionUpdate(transientClose(), socket);
  assert.equal(stored.connectionStatus, 'close');
  releasePicture({ profilePictureUrl: null });
  await oldOpen;
  assert.equal(stored.connectionStatus, 'close', 'Stale open must not win after close was handled');
}

async function terminalDoesNotRetry() {
  const { service, socket, stored } = harness();
  let attempts = 0;
  service.connectToWhatsapp = async () => { attempts++; return socket; };
  await service.connectionUpdate({ connection: 'close', lastDisconnect: {
    error: new Boom('Logged out', { statusCode: DisconnectReason.loggedOut }),
  } }, socket);
  await sleep(30);
  assert.equal(stored.connectionStatus, 'close');
  assert.equal(stored.disconnectionReasonCode, DisconnectReason.loggedOut);
  assert.equal(attempts, 0);
}

// A keep-alive 408 must never destroy credentials already paired to WhatsApp.
async function registered408Retries() {
  const { service, socket, stored } = harness();
  service.instance.authState = { state: { creds: { registered: true } } };
  const reconnectCodes: number[] = [];
  const events: string[] = [];
  service.scheduleReconnect = (code: number) => { reconnectCodes.push(code); };
  service.eventEmitter.emit = (event: string) => { events.push(event); };
  await service.connectionUpdate({ connection: 'close', lastDisconnect: {
    error: new Boom('Keep-alive timed out', { statusCode: 408 }),
  } }, socket);
  assert.deepEqual(reconnectCodes, [408]);
  assert.equal(stored.connectionStatus, 'close');
  assert.ok(!events.includes('logout.instance'), '408 may not wipe paired credentials');
}

async function unregistered408Terminates() {
  const { service, socket } = harness();
  service.instance.authState = { state: { creds: { registered: false } } };
  const reconnectCodes: number[] = [];
  const events: string[] = [];
  service.scheduleReconnect = (code: number) => { reconnectCodes.push(code); };
  service.eventEmitter.emit = (event: string) => { events.push(event); };
  await service.connectionUpdate({ connection: 'close', lastDisconnect: {
    error: new Boom('Unpaired registration timed out', { statusCode: 408 }),
  } }, socket);
  assert.deepEqual(reconnectCodes, []);
  assert.ok(events.includes('logout.instance'), 'Unregistered 408 must terminate');
}

async function trailing401After515Retries() {
  const { service, socket } = harness();
  service.lastStream515At = Date.now();
  const reconnectCodes: number[] = [];
  const events: string[] = [];
  service.scheduleReconnect = (code: number) => { reconnectCodes.push(code); };
  service.eventEmitter.emit = (event: string) => { events.push(event); };
  await service.connectionUpdate({ connection: 'close', lastDisconnect: {
    error: new Boom('Trailing loggedOut after restartRequired', { statusCode: DisconnectReason.loggedOut }),
  } }, socket);
  assert.deepEqual(reconnectCodes, [DisconnectReason.loggedOut]);
  assert.ok(!events.includes('logout.instance'), 'Recent 515 must protect the session');
}

async function expired515DoesNotMaskLogout() {
  const { service, socket } = harness();
  service.lastStream515At = Date.now() - 31_000;
  const events: string[] = [];
  service.eventEmitter.emit = (event: string) => { events.push(event); };
  service.scheduleReconnect = () => { throw new Error('401 outside grace must not reconnect'); };
  await service.connectionUpdate({ connection: 'close', lastDisconnect: {
    error: new Boom('Real loggedOut', { statusCode: DisconnectReason.loggedOut }),
  } }, socket);
  assert.ok(events.includes('logout.instance'));
}

async function main() {
  await failedReconnectThenOpen();
  await hangingReconnectThenOpen();
  await delayedOpenCannotOverwriteClose();
  await terminalDoesNotRetry();
  await registered408Retries();
  await unregistered408Terminates();
  await trailing401After515Retries();
  await expired515DoesNotMaskLogout();
  console.log('Connection recovery tests passed');
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
