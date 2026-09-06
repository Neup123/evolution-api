import { RouterBroker } from '@api/abstract/abstract.router';
import { BaileysInvokeDto, BaileysNamedInvokeDto } from '@api/dto/baileys.dto';
import { InstanceDto } from '@api/dto/instance.dto';
import { HttpStatus } from '@api/routes/index.router';
import { baileysController } from '@api/server.module';
import { baileysInvokeSchema } from '@validate/baileys.schema';
import { instanceSchema } from '@validate/instance.schema';
import { RequestHandler, Router } from 'express';

import { getBaileysNamedBodySchema, mapBaileysNamedBodyToArgs, mapBaileysNamedQueryToBody } from './baileys.metadata';
import { BAILEYS_API_METHODS, BAILEYS_METHOD_GROUPS } from './baileys.methods';

export class BaileysRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router
      .post(this.routerPath('onWhatsapp'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.onWhatsapp(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('profilePictureUrl'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.profilePictureUrl(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('assertSessions'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.assertSessions(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('createParticipantNodes'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.createParticipantNodes(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('getUSyncDevices'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.getUSyncDevices(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('generateMessageTag'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.generateMessageTag(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('sendNode'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.sendNode(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('signalRepositoryDecryptMessage'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.signalRepositoryDecryptMessage(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('getAuthState'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.getAuthState(instance),
        });

        res.status(HttpStatus.OK).json(response);
      });

    this.router.get(this.routerPath('methods'), ...guards, async (_req, res) => {
      res.status(HttpStatus.OK).json(baileysController.listMethods());
    });

    for (const method of BAILEYS_API_METHODS) {
      this.router.post(this.routerPath(method), ...guards, async (req, res) => {
        const response = await this.dataValidate<BaileysInvokeDto>({
          request: req,
          schema: baileysInvokeSchema,
          ClassRef: BaileysInvokeDto,
          execute: (instance, data) => baileysController.invoke(instance, method, data.args),
        });

        res.status(HttpStatus.OK).json(response);
      });
    }

    for (const [group, methods] of Object.entries(BAILEYS_METHOD_GROUPS)) {
      for (const method of methods) {
        this.router.post(`/${group}/${method}/:instanceName`, ...guards, async (req, res) => {
          Object.assign(req.body, mapBaileysNamedQueryToBody(method, req.query as Record<string, unknown>));
          const response = await this.dataValidate<BaileysNamedInvokeDto>({
            request: req,
            schema: getBaileysNamedBodySchema(method),
            ClassRef: BaileysNamedInvokeDto,
            execute: (instance, data) =>
              baileysController.invoke(instance, method, mapBaileysNamedBodyToArgs(method, data)),
          });

          res.status(HttpStatus.OK).json(response);
        });
      }
    }
  }

  public readonly router: Router = Router();
}
