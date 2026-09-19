import { RouterBroker } from '@api/abstract/abstract.router';
import { InstanceDto } from '@api/dto/instance.dto';
import {
  SettingsTemplateAssignDto,
  SettingsTemplateCreateDto,
  SettingsTemplateDeleteDto,
  SettingsTemplateDuplicateDto,
  SettingsTemplateEditDto,
  SettingsTemplateUnassignDto,
} from '@api/dto/settingsTemplate.dto';
import { settingsTemplateService } from '@api/server.module';
import {
  settingsTemplateAssignSchema,
  settingsTemplateCreateSchema,
  settingsTemplateDeleteSchema,
  settingsTemplateDuplicateSchema,
  settingsTemplateEditSchema,
  settingsTemplateUnassignSchema,
} from '@validate/validate.schema';
import { RequestHandler, Router } from 'express';

import { HttpStatus } from './index.router';

export class SettingsTemplateRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router
      .post(this.routerPath('create', false), ...guards, async (req, res) => {
        const data = await this.dataValidate<SettingsTemplateCreateDto>({
          request: req,
          schema: settingsTemplateCreateSchema,
          ClassRef: SettingsTemplateCreateDto,
          execute: async (_instance, value) => settingsTemplateService.create(value.name, value.settings),
        });
        res.status(HttpStatus.CREATED).json(data);
      })
      .post(this.routerPath('edit', false), ...guards, async (req, res) => {
        const data = await this.dataValidate<SettingsTemplateEditDto>({
          request: req,
          schema: settingsTemplateEditSchema,
          ClassRef: SettingsTemplateEditDto,
          execute: async (_instance, value) =>
            settingsTemplateService.edit(value.templateId, value.name, value.settings),
        });
        res.status(HttpStatus.OK).json(data);
      })
      .post(this.routerPath('duplicate', false), ...guards, async (req, res) => {
        const data = await this.dataValidate<SettingsTemplateDuplicateDto>({
          request: req,
          schema: settingsTemplateDuplicateSchema,
          ClassRef: SettingsTemplateDuplicateDto,
          execute: async (_instance, value) => settingsTemplateService.duplicate(value.templateId, value.name),
        });
        res.status(HttpStatus.CREATED).json(data);
      })
      .delete(this.routerPath('delete', false), ...guards, async (req, res) => {
        const data = await this.dataValidate<SettingsTemplateDeleteDto>({
          request: req,
          schema: settingsTemplateDeleteSchema,
          ClassRef: SettingsTemplateDeleteDto,
          execute: async (_instance, value) => settingsTemplateService.delete(value.templateId),
        });
        res.status(HttpStatus.OK).json(data);
      })
      .get(this.routerPath('list', false), ...guards, async (_req, res) =>
        res.status(HttpStatus.OK).json(await settingsTemplateService.list()),
      )
      .post(this.routerPath('assign'), ...guards, async (req, res) => {
        const data = await this.dataValidate<SettingsTemplateAssignDto>({
          request: req,
          schema: settingsTemplateAssignSchema,
          ClassRef: SettingsTemplateAssignDto,
          execute: async (instance, value) =>
            settingsTemplateService.assignByName(instance.instanceName, value.templateId, value.scope, value.target),
        });
        res.status(HttpStatus.OK).json(data);
      })
      .delete(this.routerPath('unassign'), ...guards, async (req, res) => {
        const data = await this.dataValidate<SettingsTemplateUnassignDto>({
          request: req,
          schema: settingsTemplateUnassignSchema,
          ClassRef: SettingsTemplateUnassignDto,
          execute: async (instance, value) =>
            settingsTemplateService.unassignByName(instance.instanceName, value.scope, value.target),
        });
        res.status(HttpStatus.OK).json(data);
      })
      .get(this.routerPath('bindings'), ...guards, async (req, res) => {
        const data = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: async (instance) => settingsTemplateService.bindingsByName(instance.instanceName),
        });
        res.status(HttpStatus.OK).json(data);
      });
  }
  public readonly router: Router = Router();
}
