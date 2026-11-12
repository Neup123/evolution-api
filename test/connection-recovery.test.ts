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
    ws: { isOpen: true, close() {} },
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
  service.stream515GraceMs = 30_000;
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
      findUnique: async () => ({ connectionStatus: stored.connectionStatus }),
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

// A native Baileys close must schedule recovery even if Prisma is unavailable.
async function nativeCloseWriteFailureStillRetries() {
  const { service, socket, logs } = harness();
  service.prismaRepository.instance.update = async () => { throw new Error('Prisma unavailable'); };
  const reconnectCodes: number[] = [];
  service.scheduleReconnect = (code: number) => { reconnectCodes.push(code); };

  await service.connectionUpdate(transientClose(), socket);
  assert.equal(service.stateConnection.state, 'close');
  assert.deepEqual(reconnectCodes, [DisconnectReason.connectionLost]);
  assert.ok(logs.some((line) => line.includes('Could not persist WhatsApp close transition')));
}

// The raw socket open does not complete a pending attempt while the DB write is pending.
async function reconnectOpensOnlyAfterStoredWrite() {
  const { service, socket, stored } = harness();
  stored.connectionStatus = 'close';
  let releaseWrite!: () => void;
  const settled: string[] = [];
  service.pendingReconnect = { settle: (kind: string) => { settled.push(kind); } };
  service.prismaRepository.instance.update = async ({ data }: any) => {
    await new Promise<void>((resolve) => { releaseWrite = resolve; });
    Object.assign(stored, data);
  };

  const opening = service.connectionUpdate({ connection: 'open' }, socket);
  await until(() => typeof releaseWrite === 'function', 'Open status write never began');
  assert.deepEqual(settled, [], 'Open must not settle before its final persisted status');
  assert.equal(stored.connectionStatus, 'close');
  releaseWrite();
  await opening;
  assert.equal(stored.connectionStatus, 'open');
  assert.deepEqual(settled, ['opened']);
}

// A failed final open write is a failed recovery, not an acknowledged success.
async function failedOpenStatusWriteStaysRetryable() {
  const { service, socket, stored, logs } = harness();
  stored.connectionStatus = 'close';
  const settled: string[] = [];
  const reconnectCodes: number[] = [];
  service.pendingReconnect = { settle: (kind: string) => { settled.push(kind); } };
  service.scheduleReconnect = (code: number) => { reconnectCodes.push(code); };
  service.prismaRepository.instance.update = async () => { throw new Error('Open status write rejected'); };

  await service.connectionUpdate({ connection: 'open' }, socket);
  assert.equal(service.stateConnection.state, 'close');
  assert.equal(stored.connectionStatus, 'close');
  assert.deepEqual(settled, ['closed'], 'Failed open write must not report opened');
  assert.deepEqual(reconnectCodes, [DisconnectReason.connectionLost]);
  assert.ok(logs.some((line) => line.includes('Could not persist WhatsApp open transition')));
}


// A QR/revision event while the profile is pending cannot orphan an already-open
// socket. The final open must use the current revision, not abandon persistence.
async function revisionBumpDuringProfileFetchReconciles() {
  const { service, socket, stored, logs } = harness();
  stored.connectionStatus = 'close';
  let releasePicture!: (picture: { profilePictureUrl: null }) => void;
  service.profilePicture = () => new Promise((resolve) => { releasePicture = resolve; });
  const settled: string[] = [];
  service.pendingReconnect = { settle: (kind: string) => settled.push(kind) };

  const opening = service.connectionUpdate({ connection: 'open' }, socket);
  await until(() => typeof releasePicture === 'function', 'Open profile request did not begin');
  service.connectionRevision++;
  releasePicture({ profilePictureUrl: null });
  await opening;

  assert.equal(stored.connectionStatus, 'open');
  assert.equal(stored.disconnectionAt, null);
  assert.deepEqual(settled, ['opened']);
  assert.ok(logs.some((line) => line.includes('guard=profile-await')));
}

// An IQ ping error from WhatsApp or a proxy does not prove the transport died.
async function watchdogProbeFailureRetainsLiveSocket() {
  const { service, socket, stored, logs } = harness();
  let ends = 0;
  socket.query = async () => { throw new Error('Simulated ping delay'); };
  socket.end = () => { ends++; };

  await service.checkSocketHealth(socket);
  assert.equal(ends, 0, 'A healthy WebSocket must not be ended after a failed ping');
  assert.equal(service.stateConnection.state, 'open');
  assert.equal(stored.connectionStatus, 'open');
  assert.ok(logs.some((line) => line.includes('result=degraded')));
}

// A missed timeout callback cannot leave a paired, closed account idle forever.
async function supervisorRearmsAbandonedReconnect() {
  const { service, stored } = harness();
  service.stateConnection = { state: 'close', statusReason: 408 };
  stored.connectionStatus = 'close';
  const scheduled: number[] = [];
  service.scheduleReconnect = (code: number) => scheduled.push(code);

  await service.superviseConnection();
  assert.deepEqual(scheduled, [408]);
}

// The fallback supervisor repairs open-in-memory/close-in-DB divergence.
async function supervisorRepairsOrphanedOpen() {
  const { service, stored, socket, logs } = harness();
  stored.connectionStatus = 'close';
  service.openObservedAt = Date.now() - 180_000;
  const settled: string[] = [];
  service.pendingReconnect = { settle: (kind: string) => settled.push(kind) };

  await service.superviseConnection();
  assert.equal(stored.connectionStatus, 'open');
  assert.deepEqual(settled, ['opened']);
  assert.ok(logs.some((line) => line.includes('result=orphan-open')));
  assert.equal(socket.ws.isOpen, true);
}

// The independent supervisor detects an actually closed transport even if
// Baileys did not deliver a close event.
async function supervisorClosesPersistentlyDeadTransport() {
  const { service, socket, stored } = harness();
  socket.ws.isOpen = false;
  service.socketClosedObservedAt = Date.now() - 70_000;
  const scheduled: number[] = [];
  service.scheduleReconnect = (code: number) => scheduled.push(code);

  await service.superviseConnection();
  assert.equal(stored.connectionStatus, 'close');
  assert.deepEqual(scheduled, [408]);
}


// A real open event with a stuck profile request must not be killed merely
// because the reconnection attempt's status-write deadline expired.
async function timedOutProfileDoesNotKillLiveSocket() {
  const { service, socket, stored, logs } = harness();
  stored.connectionStatus = 'close';
  service.stateConnection = { state: 'close' };
  service.reconnectAttemptTimeoutMs = 25;
  let ended = 0;
  socket.end = () => { ended++; };
  service.profilePicture = () => new Promise(() => {});
  service.connectToWhatsapp = async () => {
    service.activeSocketBuildRevision = ++service.socketBuildRevision;
    queueMicrotask(() => { void service.connectionUpdate({ connection: 'open' }, socket); });
    return socket;
  };
  const attempt = service.runReconnectAttempt();
  await sleep(65);
  await attempt;

  assert.equal(stored.connectionStatus, 'open');
  assert.equal(service.stateConnection.state, 'open');
  assert.equal(ended, 0, 'A live WebSocket must survive a delayed profile fetch');
  assert.ok(logs.some((line) => line.includes('outcome=late_open_reconciled')));
}

async function main() {
  await timedOutProfileDoesNotKillLiveSocket();
  await revisionBumpDuringProfileFetchReconciles();
  await watchdogProbeFailureRetainsLiveSocket();
  await supervisorRearmsAbandonedReconnect();
  await supervisorRepairsOrphanedOpen();
  await supervisorClosesPersistentlyDeadTransport();
  await nativeCloseWriteFailureStillRetries();
  await reconnectOpensOnlyAfterStoredWrite();
  await failedOpenStatusWriteStaysRetryable();
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
