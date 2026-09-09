import type { PrismaRepository } from '@api/repository/repository.service';
import type { ConfigService, Database } from '@config/env.config';
import type { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

export const LOCALIZABLE_BAILEYS_METHODS = [
  'communityMetadata',
  'communityFetchLinkedGroups',
  'communityRequestParticipantsList',
  'communityInviteCode',
  'communityGetInviteInfo',
  'communityFetchAllParticipating',
  'getOrderDetails',
  'getCatalog',
  'getCollections',
  'fetchPrivacySettings',
  'newsletterSubscribers',
  'newsletterMetadata',
  'newsletterFetchMessages',
  'newsletterAdminCount',
  'groupMetadata',
  'groupRequestParticipantsList',
  'groupInviteCode',
  'groupGetInviteInfo',
  'groupFetchAllParticipating',
  'getBotListV2',
  'fetchBlocklist',
  'fetchStatus',
  'fetchDisappearingDuration',
  'getBusinessProfile',
  'fetchAccountReachoutTimelock',
  'fetchNewChatMessageCap',
  'onWhatsapp',
  'profilePictureUrl',
] as const;

export type LocalizableBaileysMethod = (typeof LOCALIZABLE_BAILEYS_METHODS)[number];

export const LOCALIZABLE_EVOLUTION_METHODS = [
  'chat.whatsappNumbers',
  'chat.fetchProfilePictureUrl',
  'chat.fetchProfile',
  'chat.fetchBusinessProfile',
  'chat.fetchPrivacySettings',
  'group.findGroupInfos',
  'group.fetchAllGroups',
  'group.participants',
] as const;

export type LocalReadResult<T> = {
  value: T;
  source: 'local' | 'live';
  ageSeconds?: number;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

export function localReadArgumentsKey(args: unknown[]): string {
  return createHash('sha256')
    .update(JSON.stringify(stableValue(args)))
    .digest('hex');
}

export function supportsLocalRead(method: string): boolean {
  return (
    (LOCALIZABLE_BAILEYS_METHODS as readonly string[]).includes(method) ||
    (LOCALIZABLE_EVOLUTION_METHODS as readonly string[]).includes(method)
  );
}

export function forceLiveRead(...values: unknown[]): boolean {
  return values.some((value) => value === true || value === 'true');
}

export class LocalReadService {
  constructor(
    private readonly prismaRepository: PrismaRepository,
    private readonly configService: ConfigService,
  ) {}

  private readonly inFlight = new Map<string, Promise<unknown>>();

  public async execute<T>(options: {
    instanceName: string;
    method: string;
    args?: unknown[];
    live?: boolean;
    callLive: () => Promise<T>;
  }): Promise<LocalReadResult<T>> {
    const database = this.configService.get<Database>('DATABASE');
    const args = options.args ?? [];
    if (!database.READ_THROUGH.ENABLED || !supportsLocalRead(options.method)) {
      return { value: await options.callLive(), source: 'live' };
    }

    const instance = await this.prismaRepository.instance.findUnique({
      where: { name: options.instanceName },
      select: { id: true },
    });
    if (!instance) {
      throw {
        status: 404,
        error: 'Not Found',
        message: [`Instance ${options.instanceName} not found`],
      };
    }

    const argumentsKey = localReadArgumentsKey(args);
    const uniqueKey = `${instance.id}:${options.method}:${argumentsKey}`;
    const ttlSeconds = database.READ_THROUGH.TTL_OVERRIDES[options.method] ?? database.READ_THROUGH.TTL_SECONDS;

    if (!options.live) {
      const snapshot = await this.prismaRepository.localReadSnapshot.findUnique({
        where: {
          instanceId_method_argumentsKey: { instanceId: instance.id, method: options.method, argumentsKey },
        },
      });
      if (snapshot?.complete) {
        const ageSeconds = Math.max(0, Math.floor((Date.now() - snapshot.fetchedAt.getTime()) / 1000));
        if (ageSeconds <= ttlSeconds) {
          return { value: snapshot.result as T, source: 'local', ageSeconds };
        }
      }
    }

    const existing = this.inFlight.get(uniqueKey) as Promise<T> | undefined;
    const livePromise = existing ?? options.callLive();
    if (!existing) this.inFlight.set(uniqueKey, livePromise);

    try {
      const value = await livePromise;
      if (value !== undefined) {
        const result = JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
        await this.prismaRepository.localReadSnapshot.upsert({
          where: {
            instanceId_method_argumentsKey: { instanceId: instance.id, method: options.method, argumentsKey },
          },
          create: { instanceId: instance.id, method: options.method, argumentsKey, result, complete: true },
          update: { result, complete: true, fetchedAt: new Date() },
        });
      }
      return { value, source: 'live' };
    } finally {
      if (!existing) this.inFlight.delete(uniqueKey);
    }
  }

  public async invalidate(instanceId: string, methods: readonly string[]) {
    await this.prismaRepository.localReadSnapshot.deleteMany({
      where: { instanceId, method: { in: [...methods] } },
    });
  }

  public async invalidateByInstanceName(instanceName: string, methods: readonly string[]) {
    const instance = await this.prismaRepository.instance.findUnique({
      where: { name: instanceName },
      select: { id: true },
    });
    if (instance) await this.invalidate(instance.id, methods);
  }

  public async store<T>(instanceId: string, method: string, args: unknown[], value: T) {
    if (value === undefined) return;
    const argumentsKey = localReadArgumentsKey(args);
    const result = JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await this.prismaRepository.localReadSnapshot.upsert({
      where: { instanceId_method_argumentsKey: { instanceId, method, argumentsKey } },
      create: { instanceId, method, argumentsKey, result, complete: true },
      update: { result, complete: true, fetchedAt: new Date() },
    });
  }
}
