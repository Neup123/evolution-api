import { InstanceDto } from '@api/dto/instance.dto';
import { LocalReadService, supportsLocalRead } from '@api/services/local-read.service';
import { WAMonitoringService } from '@api/services/monitor.service';

import { listBaileysMethodMetadata } from './baileys.metadata';
import {
  BAILEYS_API_METHODS,
  BAILEYS_EXISTING_API_METHODS,
  BAILEYS_METHOD_GROUPS,
  BAILEYS_UNSUPPORTED_API_METHODS,
  BAILEYS_VERSION,
  BaileysApiMethod,
} from './baileys.methods';

export class BaileysController {
  constructor(
    private readonly waMonitor: WAMonitoringService,
    private readonly localReadService: LocalReadService,
  ) {}

  public async onWhatsapp({ instanceName }: InstanceDto, body: any, live = false) {
    const read = await this.localReadService.execute({
      instanceName,
      method: 'onWhatsapp',
      args: [body?.jid],
      live,
      callLive: () => this.waMonitor.waInstances[instanceName].baileysOnWhatsapp(body?.jid),
    });
    return { response: read.value, source: read.source, ageSeconds: read.ageSeconds };
  }

  public async profilePictureUrl({ instanceName }: InstanceDto, body: any, live = false) {
    const args = [body?.jid, body?.type, body?.timeoutMs];
    const read = await this.localReadService.execute({
      instanceName,
      method: 'profilePictureUrl',
      args,
      live,
      callLive: () =>
        this.waMonitor.waInstances[instanceName].baileysProfilePictureUrl(body?.jid, body?.type, body?.timeoutMs),
    });
    return { response: read.value, source: read.source, ageSeconds: read.ageSeconds };
  }

  public async assertSessions({ instanceName }: InstanceDto, body: any) {
    const instance = this.waMonitor.waInstances[instanceName];

    return instance.baileysAssertSessions(body?.jids, body?.force);
  }

  public async createParticipantNodes({ instanceName }: InstanceDto, body: any) {
    const instance = this.waMonitor.waInstances[instanceName];

    return instance.baileysCreateParticipantNodes(body?.jids, body?.message, body?.extraAttrs);
  }

  public async getUSyncDevices({ instanceName }: InstanceDto, body: any) {
    const instance = this.waMonitor.waInstances[instanceName];

    return instance.baileysGetUSyncDevices(body?.jids, body?.useCache, body?.ignoreZeroDevices);
  }

  public async generateMessageTag({ instanceName }: InstanceDto) {
    const instance = this.waMonitor.waInstances[instanceName];

    return instance.baileysGenerateMessageTag();
  }

  public async sendNode({ instanceName }: InstanceDto, body: any) {
    const instance = this.waMonitor.waInstances[instanceName];

    return instance.baileysSendNode(body?.stanza);
  }

  public async signalRepositoryDecryptMessage({ instanceName }: InstanceDto, body: any) {
    const instance = this.waMonitor.waInstances[instanceName];

    return instance.baileysSignalRepositoryDecryptMessage(body?.jid, body?.type, body?.ciphertext);
  }

  public async getAuthState({ instanceName }: InstanceDto) {
    const instance = this.waMonitor.waInstances[instanceName];

    return instance.baileysGetAuthState();
  }

  public listMethods() {
    return {
      version: BAILEYS_VERSION,
      methods: BAILEYS_API_METHODS,
      groups: BAILEYS_METHOD_GROUPS,
      metadata: listBaileysMethodMetadata(),
      execution: Object.fromEntries(
        [...BAILEYS_API_METHODS, ...BAILEYS_EXISTING_API_METHODS].map((method) => [
          method,
          supportsLocalRead(method) ? 'local-first' : 'live-only',
        ]),
      ),
      manualRoutes: {
        onWhatsapp: '/baileys/account/onWhatsapp/:instanceName',
        profilePictureUrl: '/baileys/account/profilePictureUrl/:instanceName',
        assertSessions: '/baileys/advanced/assertSessions/:instanceName',
        createParticipantNodes: '/baileys/advanced/createParticipantNodes/:instanceName',
        getUSyncDevices: '/baileys/advanced/getUSyncDevices/:instanceName',
        generateMessageTag: '/baileys/advanced/generateMessageTag/:instanceName',
        sendNode: '/baileys/advanced/sendNode/:instanceName',
        signalRepositoryDecryptMessage: '/baileys/advanced/signalRepositoryDecryptMessage/:instanceName',
        getAuthState: '/baileys/advanced/getAuthState/:instanceName',
      },
      removedLegacyRoute: '/baileys/{method}/{instanceName}',
      unsupportedMethods: BAILEYS_UNSUPPORTED_API_METHODS,
      binaryFormat: { $base64: '<base64 encoded bytes>' },
    };
  }

  public async invoke({ instanceName }: InstanceDto, method: BaileysApiMethod, args: unknown[] = [], live = false) {
    const read = await this.localReadService.execute({
      instanceName,
      method,
      args,
      live,
      callLive: async () => {
        const instance = this.waMonitor.waInstances[instanceName];
        return instance.baileysInvoke(method, args);
      },
    });

    if (!supportsLocalRead(method)) {
      if (method.startsWith('group') || method.startsWith('community')) {
        await this.localReadService.invalidateByInstanceName(instanceName, [
          'groupMetadata',
          'groupRequestParticipantsList',
          'groupInviteCode',
          'groupGetInviteInfo',
          'groupFetchAllParticipating',
          'communityMetadata',
          'communityFetchLinkedGroups',
          'communityRequestParticipantsList',
          'communityInviteCode',
          'communityGetInviteInfo',
          'communityFetchAllParticipating',
          'group.findGroupInfos',
          'group.fetchAllGroups',
          'group.participants',
        ]);
      } else if (method.startsWith('newsletter')) {
        await this.localReadService.invalidateByInstanceName(instanceName, [
          'newsletterSubscribers',
          'newsletterMetadata',
          'newsletterFetchMessages',
          'newsletterAdminCount',
        ]);
      } else if (method.startsWith('product') || method.startsWith('updateBussines')) {
        await this.localReadService.invalidateByInstanceName(instanceName, [
          'getOrderDetails',
          'getCatalog',
          'getCollections',
          'getBusinessProfile',
          'chat.fetchBusinessProfile',
        ]);
      } else if (method.startsWith('update')) {
        await this.localReadService.invalidateByInstanceName(instanceName, [
          'fetchPrivacySettings',
          'fetchBlocklist',
          'fetchStatus',
          'fetchDisappearingDuration',
          'getBusinessProfile',
          'chat.fetchPrivacySettings',
          'chat.fetchProfile',
          'chat.fetchBusinessProfile',
          'chat.fetchProfilePictureUrl',
          'chat.whatsappNumbers',
        ]);
      }
    }

    return { response: read.value, source: read.source, ageSeconds: read.ageSeconds };
  }
}
