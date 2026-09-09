import {
  AcceptGroupInvite,
  CreateGroupDto,
  GetParticipant,
  GroupDescriptionDto,
  GroupInvite,
  GroupJid,
  GroupPictureDto,
  GroupSendInvite,
  GroupSubjectDto,
  GroupToggleEphemeralDto,
  GroupUpdateParticipantDto,
  GroupUpdateSettingDto,
} from '@api/dto/group.dto';
import { InstanceDto } from '@api/dto/instance.dto';
import { forceLiveRead, LocalReadService } from '@api/services/local-read.service';
import { WAMonitoringService } from '@api/services/monitor.service';

export class GroupController {
  constructor(
    private readonly waMonitor: WAMonitoringService,
    private readonly localReadService: LocalReadService,
  ) {}

  private async invalidateGroupReads(instanceName: string) {
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
  }

  public async createGroup(instance: InstanceDto, create: CreateGroupDto) {
    const response = await this.waMonitor.waInstances[instance.instanceName].createGroup(create);
    await this.invalidateGroupReads(instance.instanceName);
    return response;
  }

  public async updateGroupPicture(instance: InstanceDto, update: GroupPictureDto) {
    const response = await this.waMonitor.waInstances[instance.instanceName].updateGroupPicture(update);
    await this.invalidateGroupReads(instance.instanceName);
    return response;
  }

  public async updateGroupSubject(instance: InstanceDto, update: GroupSubjectDto) {
    const response = await this.waMonitor.waInstances[instance.instanceName].updateGroupSubject(update);
    await this.invalidateGroupReads(instance.instanceName);
    return response;
  }

  public async updateGroupDescription(instance: InstanceDto, update: GroupDescriptionDto) {
    const response = await this.waMonitor.waInstances[instance.instanceName].updateGroupDescription(update);
    await this.invalidateGroupReads(instance.instanceName);
    return response;
  }

  public async findGroupInfo(instance: InstanceDto, groupJid: GroupJid) {
    return (
      await this.localReadService.execute({
        instanceName: instance.instanceName,
        method: 'group.findGroupInfos',
        args: [groupJid.groupJid],
        live: forceLiveRead(groupJid.live, instance.live),
        callLive: () => this.waMonitor.waInstances[instance.instanceName].findGroup(groupJid),
      })
    ).value;
  }

  public async fetchAllGroups(instance: InstanceDto, getPaticipants: GetParticipant) {
    return (
      await this.localReadService.execute({
        instanceName: instance.instanceName,
        method: 'group.fetchAllGroups',
        args: [getPaticipants.getParticipants],
        live: forceLiveRead(getPaticipants.live, instance.live),
        callLive: () => this.waMonitor.waInstances[instance.instanceName].fetchAllGroups(getPaticipants),
      })
    ).value;
  }

  public async inviteCode(instance: InstanceDto, groupJid: GroupJid) {
    return await this.waMonitor.waInstances[instance.instanceName].inviteCode(groupJid);
  }

  public async inviteInfo(instance: InstanceDto, inviteCode: GroupInvite) {
    return await this.waMonitor.waInstances[instance.instanceName].inviteInfo(inviteCode);
  }

  public async sendInvite(instance: InstanceDto, data: GroupSendInvite) {
    return await this.waMonitor.waInstances[instance.instanceName].sendInvite(data);
  }

  public async acceptInviteCode(instance: InstanceDto, inviteCode: AcceptGroupInvite) {
    return await this.waMonitor.waInstances[instance.instanceName].acceptInviteCode(inviteCode);
  }

  public async revokeInviteCode(instance: InstanceDto, groupJid: GroupJid) {
    const response = await this.waMonitor.waInstances[instance.instanceName].revokeInviteCode(groupJid);
    await this.invalidateGroupReads(instance.instanceName);
    return response;
  }

  public async findParticipants(instance: InstanceDto, groupJid: GroupJid) {
    return (
      await this.localReadService.execute({
        instanceName: instance.instanceName,
        method: 'group.participants',
        args: [groupJid.groupJid],
        live: forceLiveRead(groupJid.live, instance.live),
        callLive: () => this.waMonitor.waInstances[instance.instanceName].findParticipants(groupJid),
      })
    ).value;
  }

  public async updateGParticipate(instance: InstanceDto, update: GroupUpdateParticipantDto) {
    const response = await this.waMonitor.waInstances[instance.instanceName].updateGParticipant(update);
    await this.invalidateGroupReads(instance.instanceName);
    return response;
  }

  public async updateGSetting(instance: InstanceDto, update: GroupUpdateSettingDto) {
    const response = await this.waMonitor.waInstances[instance.instanceName].updateGSetting(update);
    await this.invalidateGroupReads(instance.instanceName);
    return response;
  }

  public async toggleEphemeral(instance: InstanceDto, update: GroupToggleEphemeralDto) {
    const response = await this.waMonitor.waInstances[instance.instanceName].toggleEphemeral(update);
    await this.invalidateGroupReads(instance.instanceName);
    return response;
  }

  public async leaveGroup(instance: InstanceDto, groupJid: GroupJid) {
    const response = await this.waMonitor.waInstances[instance.instanceName].leaveGroup(groupJid);
    await this.invalidateGroupReads(instance.instanceName);
    return response;
  }
}
