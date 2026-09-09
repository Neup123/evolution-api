import assert from 'node:assert/strict';

import { forceLiveRead, LocalReadService, localReadArgumentsKey } from '../src/api/services/local-read.service';

type Snapshot = {
  instanceId: string;
  method: string;
  argumentsKey: string;
  result: unknown;
  complete: boolean;
  fetchedAt: Date;
};

const snapshots = new Map<string, Snapshot>();
const snapshotKey = (instanceId: string, method: string, argumentsKey: string) =>
  `${instanceId}:${method}:${argumentsKey}`;

const repository = {
  instance: {
    findUnique: async ({ where }: any) => (where.name === 'alpha' ? { id: 'instance-alpha' } : null),
  },
  localReadSnapshot: {
    findUnique: async ({ where }: any) => {
      const value = where.instanceId_method_argumentsKey;
      return snapshots.get(snapshotKey(value.instanceId, value.method, value.argumentsKey)) ?? null;
    },
    upsert: async ({ where, create, update }: any) => {
      const value = where.instanceId_method_argumentsKey;
      const key = snapshotKey(value.instanceId, value.method, value.argumentsKey);
      const previous = snapshots.get(key);
      snapshots.set(key, {
        ...(previous ?? create),
        ...update,
        fetchedAt: update.fetchedAt ?? previous?.fetchedAt ?? new Date(),
      });
    },
    deleteMany: async ({ where }: any) => {
      for (const [key, snapshot] of snapshots) {
        if (snapshot.instanceId === where.instanceId && where.method.in.includes(snapshot.method))
          snapshots.delete(key);
      }
    },
  },
} as any;

const config = {
  get: () => ({
    READ_THROUGH: { ENABLED: true, TTL_SECONDS: 60, TTL_OVERRIDES: { fetchStatus: 10 } },
  }),
} as any;

async function run() {
  assert.equal(localReadArgumentsKey([{ b: 2, a: 1 }]), localReadArgumentsKey([{ a: 1, b: 2 }]));
  assert.equal(forceLiveRead(false, 'true'), true);

  const service = new LocalReadService(repository, config);
  const args = [['123@s.whatsapp.net']];
  const key = localReadArgumentsKey(args);
  snapshots.set(snapshotKey('instance-alpha', 'fetchStatus', key), {
    instanceId: 'instance-alpha',
    method: 'fetchStatus',
    argumentsKey: key,
    result: { method: 'fetchStatus', result: [{ status: 'available' }] },
    complete: true,
    fetchedAt: new Date(),
  });

  let liveCalls = 0;
  const local = await service.execute({
    instanceName: 'alpha',
    method: 'fetchStatus',
    args,
    callLive: async () => {
      liveCalls += 1;
      return { method: 'fetchStatus', result: [] };
    },
  });
  assert.equal(local.source, 'local');
  assert.equal(liveCalls, 0);

  const forced = await service.execute({
    instanceName: 'alpha',
    method: 'fetchStatus',
    args,
    live: true,
    callLive: async () => {
      liveCalls += 1;
      return { method: 'fetchStatus', result: [{ status: 'forced' }] };
    },
  });
  assert.equal(forced.source, 'live');
  assert.equal(liveCalls, 1);

  const stale = snapshots.get(snapshotKey('instance-alpha', 'fetchStatus', key));
  stale.fetchedAt = new Date(Date.now() - 11_000);
  await assert.rejects(
    service.execute({
      instanceName: 'alpha',
      method: 'fetchStatus',
      args,
      callLive: async () => {
        throw new Error('connection closed');
      },
    }),
    /connection closed/,
  );

  snapshots.clear();
  let concurrentCalls = 0;
  const callLive = async () => {
    concurrentCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { method: 'fetchBlocklist', result: [] };
  };
  await Promise.all([
    service.execute({ instanceName: 'alpha', method: 'fetchBlocklist', callLive }),
    service.execute({ instanceName: 'alpha', method: 'fetchBlocklist', callLive }),
  ]);
  assert.equal(concurrentCalls, 1);
}

run().then(() => console.log('local read-through tests passed'));
