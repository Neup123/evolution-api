import {
  ArchiveChatDto,
  BlockUserDto,
  DeleteMessage,
  getBase64FromMediaMessageDto,
  MarkChatUnreadDto,
  NumberDto,
  PrivacySettingDto,
  ProfileNameDto,
  ProfilePictureDto,
  ProfileStatusDto,
  ReadMessageDto,
  SendPresenceDto,
  UpdateMessageDto,
  WhatsAppNumberDto,
} from '@api/dto/chat.dto';
import { InstanceDto } from '@api/dto/instance.dto';
import { Query } from '@api/repository/repository.service';
import { forceLiveRead, LocalReadService } from '@api/services/local-read.service';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Contact, Message, MessageUpdate } from '@prisma/client';

export class ChatController {
  constructor(
    private readonly waMonitor: WAMonitoringService,
    private readonly localReadService: LocalReadService,
  ) {}

  public async whatsappNumber({ instanceName, live: queryLive }: InstanceDto, data: WhatsAppNumberDto) {
    const { live: bodyLive, ...request } = data;
    const live = forceLiveRead(bodyLive, queryLive);
    return (
      await this.localReadService.execute({
        instanceName,
        method: 'chat.whatsappNumbers',
        args: [request],
        live,
        callLive: () => this.waMonitor.waInstances[instanceName].whatsappNumber(request, live),
      })
    ).value;
  }

  public async readMessage({ instanceName }: InstanceDto, data: ReadMessageDto) {
    return await this.waMonitor.waInstances[instanceName].markMessageAsRead(data);
  }

  public async archiveChat({ instanceName }: InstanceDto, data: ArchiveChatDto) {
    return await this.waMonitor.waInstances[instanceName].archiveChat(data);
  }

  public async markChatUnread({ instanceName }: InstanceDto, data: MarkChatUnreadDto) {
    return await this.waMonitor.waInstances[instanceName].markChatUnread(data);
  }

  public async deleteMessage({ instanceName }: InstanceDto, data: DeleteMessage) {
    return await this.waMonitor.waInstances[instanceName].deleteMessage(data);
  }

  public async fetchProfilePicture({ instanceName, live }: InstanceDto, data: NumberDto) {
    return (
      await this.localReadService.execute({
        instanceName,
        method: 'chat.fetchProfilePictureUrl',
        args: [data.number],
        live: forceLiveRead(data.live, live),
        callLive: () => this.waMonitor.waInstances[instanceName].profilePicture(data.number),
      })
    ).value;
  }

  public async fetchProfile({ instanceName, live }: InstanceDto, data: NumberDto) {
    const forceLive = forceLiveRead(data.live, live);
    return (
      await this.localReadService.execute({
        instanceName,
        method: 'chat.fetchProfile',
        args: [data.number],
        live: forceLive,
        callLive: () => this.waMonitor.waInstances[instanceName].fetchProfile(instanceName, data.number, forceLive),
      })
    ).value;
  }

  public async fetchContacts({ instanceName }: InstanceDto, query: Query<Contact>) {
    return await this.waMonitor.waInstances[instanceName].fetchContacts(query);
  }

  public async getBase64FromMediaMessage({ instanceName }: InstanceDto, data: getBase64FromMediaMessageDto) {
    return await this.waMonitor.waInstances[instanceName].getBase64FromMediaMessage(data);
  }

  public async fetchMessages({ instanceName }: InstanceDto, query: Query<Message>) {
    return await this.waMonitor.waInstances[instanceName].fetchMessages(query);
  }

  public async fetchStatusMessage({ instanceName }: InstanceDto, query: Query<MessageUpdate>) {
    return await this.waMonitor.waInstances[instanceName].fetchStatusMessage(query);
  }

  public async fetchChats({ instanceName }: InstanceDto, query: Query<Contact>) {
    return await this.waMonitor.waInstances[instanceName].fetchChats(query);
  }

  public async findChatByRemoteJid({ instanceName }: InstanceDto, remoteJid: string) {
    return await this.waMonitor.waInstances[instanceName].findChatByRemoteJid(remoteJid);
  }

  public async sendPresence({ instanceName }: InstanceDto, data: SendPresenceDto) {
    return await this.waMonitor.waInstances[instanceName].sendPresence(data);
  }

  public async fetchPrivacySettings({ instanceName, live }: InstanceDto) {
    return (
      await this.localReadService.execute({
        instanceName,
        method: 'chat.fetchPrivacySettings',
        live: forceLiveRead(live),
        callLive: () => this.waMonitor.waInstances[instanceName].fetchPrivacySettings(),
      })
    ).value;
  }

  public async updatePrivacySettings({ instanceName }: InstanceDto, data: PrivacySettingDto) {
    const response = await this.waMonitor.waInstances[instanceName].updatePrivacySettings(data);
    await this.localReadService.invalidateByInstanceName(instanceName, [
      'fetchPrivacySettings',
      'chat.fetchPrivacySettings',
    ]);
    return response;
  }

  public async fetchBusinessProfile({ instanceName, live }: InstanceDto, data: ProfilePictureDto) {
    const forceLive = forceLiveRead(data.live, live);
    return (
      await this.localReadService.execute({
        instanceName,
        method: 'chat.fetchBusinessProfile',
        args: [data.number],
        live: forceLive,
        callLive: () => this.waMonitor.waInstances[instanceName].fetchBusinessProfile(data.number, forceLive),
      })
    ).value;
  }

  public async updateProfileName({ instanceName }: InstanceDto, data: ProfileNameDto) {
    const response = await this.waMonitor.waInstances[instanceName].updateProfileName(data.name);
    await this.localReadService.invalidateByInstanceName(instanceName, ['chat.fetchProfile']);
    return response;
  }

  public async updateProfileStatus({ instanceName }: InstanceDto, data: ProfileStatusDto) {
    const response = await this.waMonitor.waInstances[instanceName].updateProfileStatus(data.status);
    await this.localReadService.invalidateByInstanceName(instanceName, ['fetchStatus', 'chat.fetchProfile']);
    return response;
  }

  public async updateProfilePicture({ instanceName }: InstanceDto, data: ProfilePictureDto) {
    const response = await this.waMonitor.waInstances[instanceName].updateProfilePicture(data.picture);
    await this.localReadService.invalidateByInstanceName(instanceName, [
      'profilePictureUrl',
      'chat.fetchProfilePictureUrl',
      'chat.fetchProfile',
    ]);
    return response;
  }

  public async removeProfilePicture({ instanceName }: InstanceDto) {
    const response = await this.waMonitor.waInstances[instanceName].removeProfilePicture();
    await this.localReadService.invalidateByInstanceName(instanceName, [
      'profilePictureUrl',
      'chat.fetchProfilePictureUrl',
      'chat.fetchProfile',
    ]);
    return response;
  }

  public async updateMessage({ instanceName }: InstanceDto, data: UpdateMessageDto) {
    return await this.waMonitor.waInstances[instanceName].updateMessage(data);
  }

  public async blockUser({ instanceName }: InstanceDto, data: BlockUserDto) {
    return await this.waMonitor.waInstances[instanceName].blockUser(data);
  }
}
