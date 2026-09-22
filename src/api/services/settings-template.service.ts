import { TemplateSettings } from '@api/dto/settingsTemplate.dto';
import { PrismaRepository } from '@api/repository/repository.service';
import { BadRequestException, NotFoundException } from '@exceptions';

import { resolveSettingsTemplate } from './settings-template-resolution';

export class SettingsTemplateService {
  constructor(private readonly prisma: PrismaRepository) {}

  private validate(settings?: TemplateSettings) {
    if (settings?.mistakesGenerator && settings.mistakesGenerator.minLetters > settings.mistakesGenerator.maxLetters)
      throw new BadRequestException('mistakesGenerator.minLetters must not exceed maxLetters.');
  }

  private async instanceId(instanceName: string) {
    const instance = await this.prisma.instance.findUnique({ where: { name: instanceName }, select: { id: true } });
    if (!instance) throw new NotFoundException(`Instance ${instanceName} not found`);
    return instance.id;
  }

  private target(scope: string, target?: string) {
    if (scope === 'instance') {
      if (target) throw new BadRequestException('Instance template assignment must not include target.');
      return '';
    }
    if (!target) throw new BadRequestException(`${scope} template assignment requires target.`);
    const normalized = target.trim().toLowerCase();
    if (scope === 'group' && !normalized.endsWith('@g.us'))
      throw new BadRequestException('Group target must end in @g.us.');
    if (scope === 'contact' && normalized.endsWith('@g.us'))
      throw new BadRequestException('Contact target cannot be a group JID.');
    return normalized;
  }

  async create(name: string, settings: TemplateSettings) {
    this.validate(settings);
    return this.prisma.settingsTemplate.create({ data: { name: name.trim(), settings: settings as any } });
  }
  async edit(templateId: string, name?: string, settings?: TemplateSettings) {
    this.validate(settings);
    await this.get(templateId);
    return this.prisma.settingsTemplate.update({
      where: { id: templateId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(settings !== undefined ? { settings: settings as any } : {}),
      },
    });
  }
  async duplicate(templateId: string, name: string) {
    const source = await this.get(templateId);
    return this.create(name, source.settings as TemplateSettings);
  }
  async list() {
    return this.prisma.settingsTemplate.findMany({ orderBy: { name: 'asc' }, include: { bindings: true } });
  }
  async get(templateId: string) {
    const item = await this.prisma.settingsTemplate.findUnique({ where: { id: templateId } });
    if (!item) throw new NotFoundException(`Settings template ${templateId} not found`);
    return item;
  }
  async delete(templateId: string) {
    await this.get(templateId);
    return this.prisma.settingsTemplate.delete({ where: { id: templateId } });
  }
  async assignByName(instanceName: string, templateId: string, scope: string, target?: string) {
    await this.get(templateId);
    const instanceId = await this.instanceId(instanceName);
    const normalized = this.target(scope, target);
    return this.prisma.settingsTemplateBinding.upsert({
      where: { instanceId_scope_target: { instanceId, scope, target: normalized } },
      create: { instanceId, templateId, scope, target: normalized },
      update: { templateId },
      include: { Template: true },
    });
  }
  async unassignByName(instanceName: string, scope: string, target?: string) {
    const instanceId = await this.instanceId(instanceName);
    const normalized = this.target(scope, target);
    return this.prisma.settingsTemplateBinding.deleteMany({ where: { instanceId, scope, target: normalized } });
  }
  async bindingsByName(instanceName: string) {
    const instanceId = await this.instanceId(instanceName);
    return this.prisma.settingsTemplateBinding.findMany({
      where: { instanceId },
      include: { Template: true },
      orderBy: [{ scope: 'asc' }, { target: 'asc' }],
    });
  }
  async resolve(
    instanceId: string,
    recipient?: string,
    requestedTemplateId?: string,
  ): Promise<TemplateSettings | null> {
    return resolveSettingsTemplate(
      {
        getTemplate: (id) => this.prisma.settingsTemplate.findUnique({ where: { id } }),
        getBinding: (scope, target) =>
          this.prisma.settingsTemplateBinding.findUnique({
            where: { instanceId_scope_target: { instanceId, scope, target } },
            include: { Template: true },
          }),
      },
      recipient,
      requestedTemplateId,
    );
  }
}
