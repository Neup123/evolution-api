import assert from 'node:assert/strict';
import { BaileysStartupService } from '../src/api/integrations/channel/whatsapp/whatsapp.baileys.service';

function harness() {
  const stored = { connectionStatus: 'open' as string };
  const logs: string[] = [];
  const reconnectCodes: number[] = [];
  let probes = 0;
  let ended = 0;
  const socket: any = {
    query: async () => { probes++; },
    end: () => { ended++; },
  };
  const service: any = Object.create(BaileysStartupService.prototype);
  service.instance = { id: 'instance-1', name: 'watchdog-test', qrcode: { count: 0 } };
  service.instance.authState = { state: { creds: { registered: true } } };
  service.client = socket;
  service.stateConnection = { state: 'open' };
  service.localChatwoot = { enabled: false };
  service.socketProbeTimeoutMs = 15;
  service.socketProbeIntervalMs = 60_000;
  service.watchdogRecoveryInFlight = false;
  service.configService = { get: (key: string) => key === 'CHATWOOT' ? { ENABLED: false } : {} };
  service.logger = {
    info: (line: unknown) => logs.push(String(line)),
    warn: (line: unknown) => logs.push(String(line)),
    error: (line: unknown) => logs.push(String(line)),
  };
  service.prismaRepository = { instance: {
    findUnique: async () => ({ connectionStatus: stored.connectionStatus }),
    update: async ({ data }: any) => Object.assign(stored, data),
  } };
  service.stopOutboundQueueWorker = () => {};
  service.sendDataWebhook = () => {};
  service.scheduleReconnect = (code: number) => { reconnectCodes.push(code); };
  return {
    service, socket, stored, logs, reconnectCodes,
    probes: () => probes, ended: () => ended,
  };
}

async function healthyDoesNotFlap() {
  const h = harness();
  await h.service.checkSocketHealth(h.socket);
  assert.equal(h.probes(), 1);
  assert.equal(h.stored.connectionStatus, 'open');
  assert.equal(h.reconnectCodes.length, 0);
  assert.equal(h.ended(), 0);
  assert.ok(h.logs.some((line) => line.includes('result=healthy')));
}

async function throwingSocketForcesClose() {
  const h = harness();
  h.socket.query = async () => { throw new Error('Connection Closed'); };
  await h.service.checkSocketHealth(h.socket);
  assert.equal(h.stored.connectionStatus, 'close', 'A dead-but-open socket must not stay open in fetchInstances');
  assert.equal(h.reconnectCodes.length, 1);
  assert.equal(h.ended(), 1);
  assert.ok(h.logs.some((line) => line.includes('result=failed') && line.includes('Connection Closed')));
}

async function hangingProbeForcesClose() {
  const h = harness();
  h.socket.query = () => new Promise(() => {});
  await h.service.checkSocketHealth(h.socket);
  assert.equal(h.stored.connectionStatus, 'close');
  assert.equal(h.reconnectCodes.length, 1);
  assert.equal(h.ended(), 1);
  assert.ok(h.logs.some((line) => line.includes('ping timed out')));
}

async function nonOpenOrRetryingIsNotProbed() {
  const h = harness();
  h.stored.connectionStatus = 'close';
  await h.service.checkSocketHealth(h.socket);
  assert.equal(h.probes(), 0);
  h.stored.connectionStatus = 'open';
  h.service.reconnectTimer = setTimeout(() => {}, 100);
  await h.service.checkSocketHealth(h.socket);
  clearTimeout(h.service.reconnectTimer);
  assert.equal(h.probes(), 0);
  assert.equal(h.reconnectCodes.length, 0);
}

async function main() {
  await healthyDoesNotFlap();
  await throwingSocketForcesClose();
  await hangingProbeForcesClose();
  await nonOpenOrRetryingIsNotProbed();
  console.log('Socket watchdog tests passed');
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
