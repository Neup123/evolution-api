import { InstanceDto } from '@api/dto/instance.dto';
import { SettingsDto } from '@api/dto/settings.dto';
import { Logger } from '@config/logger.config';
import { BadRequestException } from '@exceptions';

import { WAMonitoringService } from './monitor.service';

export class SettingsService {
  constructor(private readonly waMonitor: WAMonitoringService) {}

  private readonly logger = new Logger('SettingsService');

  public async create(instance: InstanceDto, data: SettingsDto) {
    if (
      data.mistakesGenerator &&
      (!Number.isFinite(data.mistakesGenerator.lettersPerMistake) || data.mistakesGenerator.lettersPerMistake < 1)
    )
      throw new BadRequestException('mistakesGenerator.lettersPerMistake must be at least 1.');
    await this.waMonitor.waInstances[instance.instanceName].setSettings(data);

    return { settings: { ...instance, settings: data } };
  }

  public async find(instance: InstanceDto): Promise<SettingsDto> {
    try {
      const result = await this.waMonitor.waInstances[instance.instanceName].findSettings();

      if (Object.keys(result).length === 0) {
        throw new Error('Settings not found');
      }

      return result;
    } catch {
      return null;
    }
  }

  public async outboundAudit(instance: InstanceDto, limit?: number, recipient?: string, status?: string) {
    return this.waMonitor.waInstances[instance.instanceName].listOutboundAudit(limit, recipient, status);
  }
}
