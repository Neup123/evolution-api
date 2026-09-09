import { RouterBroker } from '@api/abstract/abstract.router';
import { BaileysNamedInvokeDto } from '@api/dto/baileys.dto';
import { InstanceDto } from '@api/dto/instance.dto';
import { HttpStatus } from '@api/routes/index.router';
import { baileysController } from '@api/server.module';
import { instanceSchema } from '@validate/instance.schema';
import { RequestHandler, Response, Router } from 'express';

import { getBaileysNamedBodySchema, mapBaileysNamedBodyToArgs, mapBaileysNamedQueryToBody } from './baileys.metadata';
import { BAILEYS_METHOD_GROUPS } from './baileys.methods';

export class BaileysRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router
      .post('/account/onWhatsapp/:instanceName', ...guards, async (req, res) => {
        const live = req.query.live === 'true' || req.body?.live === true;
        if (req.body) delete req.body.live;
        const invocation = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.onWhatsapp(instance, req.body, live),
        });

        this.setReadHeaders(res, invocation);
        res.status(HttpStatus.OK).json(invocation.response);
      })
      .post('/account/profilePictureUrl/:instanceName', ...guards, async (req, res) => {
        const live = req.query.live === 'true' || req.body?.live === true;
        if (req.body) delete req.body.live;
        const invocation = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.profilePictureUrl(instance, req.body, live),
        });

        this.setReadHeaders(res, invocation);
        res.status(HttpStatus.OK).json(invocation.response);
      })
      .post('/advanced/assertSessions/:instanceName', ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.assertSessions(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post('/advanced/createParticipantNodes/:instanceName', ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.createParticipantNodes(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post('/advanced/getUSyncDevices/:instanceName', ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.getUSyncDevices(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post('/advanced/generateMessageTag/:instanceName', ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.generateMessageTag(instance),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post('/advanced/sendNode/:instanceName', ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.sendNode(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post('/advanced/signalRepositoryDecryptMessage/:instanceName', ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => baileysController.signalRepositoryDecryptMessage(instance, req.body),
        });

        res.status(HttpStatus.OK).json(response);
      })
      .post('/advanced/getAuthState/:instanceName', ...guards, async (req, res) => {
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

    for (const [group, methods] of Object.entries(BAILEYS_METHOD_GROUPS)) {
      for (const method of methods) {
        this.router.post(`/${group}/${method}/:instanceName`, ...guards, async (req, res) => {
          const live = req.query.live === 'true' || req.body?.live === true;
          if (req.body) delete req.body.live;
          Object.assign(req.body, mapBaileysNamedQueryToBody(method, req.query as Record<string, unknown>));
          const invocation = await this.dataValidate<BaileysNamedInvokeDto>({
            request: req,
            schema: getBaileysNamedBodySchema(method),
            ClassRef: BaileysNamedInvokeDto,
            execute: (instance, data) =>
              baileysController.invoke(instance, method, mapBaileysNamedBodyToArgs(method, data), live),
          });

          this.setReadHeaders(res, invocation);
          res.status(HttpStatus.OK).json(invocation.response);
        });
      }
    }
  }

  public readonly router: Router = Router();

  private setReadHeaders(res: Response, invocation: { source: string; ageSeconds?: number }) {
    res.setHeader('X-Evolution-Data-Source', invocation.source);
    if (invocation.ageSeconds !== undefined) res.setHeader('X-Evolution-Data-Age', invocation.ageSeconds.toString());
  }
}
