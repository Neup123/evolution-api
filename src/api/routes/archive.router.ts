import { RouterBroker } from '@api/abstract/abstract.router';
import { archiveService } from '@api/server.module';
import { Request, RequestHandler, Router } from 'express';

import { HttpStatus } from './index.router';

const archiveKey = (req: Request) => req.header('x-archive-key');

export class ArchiveRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router
      .get('/status', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res.status(HttpStatus.OK).json(await archiveService.status(req.query.instanceName as string));
      })
      .get('/events/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(
          archiveKey(req),
          req.query.includePayload === 'true' ? 'archive:export' : 'archive:read',
        );
        return res
          .status(HttpStatus.OK)
          .json(
            await archiveService.listEvents(req.params.instanceName, req.query, req.query.includePayload === 'true'),
          );
      })
      .get('/messages/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res
          .status(HttpStatus.OK)
          .json(
            await archiveService.listEvents(req.params.instanceName, { ...req.query, entityType: 'message' }, false),
          );
      })
      .get('/contacts/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res
          .status(HttpStatus.OK)
          .json(
            await archiveService.listEvents(req.params.instanceName, { ...req.query, entityType: 'contact' }, false),
          );
      })
      .get('/chats/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res
          .status(HttpStatus.OK)
          .json(await archiveService.listEvents(req.params.instanceName, { ...req.query, entityType: 'chat' }, false));
      })
      .get('/groups/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res
          .status(HttpStatus.OK)
          .json(await archiveService.listEvents(req.params.instanceName, { ...req.query, entityType: 'group' }, false));
      })
      .get('/media/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:media');
        return res.status(HttpStatus.OK).json(await archiveService.listMedia(req.params.instanceName, req.query));
      })
      .get('/messages/:instanceName/:messageId/revisions', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res
          .status(HttpStatus.OK)
          .json(
            await archiveService.messageHistory(
              req.params.instanceName,
              req.params.messageId,
              req.query.chatJid as string,
            ),
          );
      })
      .get('/receipts/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res.status(HttpStatus.OK).json(await archiveService.listReceipts(req.params.instanceName, req.query));
      })
      .get('/reactions/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res.status(HttpStatus.OK).json(await archiveService.listReactions(req.params.instanceName, req.query));
      })
      .get('/memberships/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res.status(HttpStatus.OK).json(await archiveService.listMemberships(req.params.instanceName, req.query));
      })
      .get('/calls/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res.status(HttpStatus.OK).json(await archiveService.listCalls(req.params.instanceName, req.query));
      })
      .get('/sync-gaps/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:read');
        return res.status(HttpStatus.OK).json(await archiveService.listSyncGaps(req.params.instanceName, req.query));
      })
      .get('/policies', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:policy');
        return res.status(HttpStatus.OK).json(await archiveService.listPolicies());
      })
      .put('/policies', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:policy');
        return res.status(HttpStatus.OK).json(await archiveService.putPolicy(req.body));
      })
      .post('/backfill/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:admin');
        return res
          .status(HttpStatus.CREATED)
          .json(await archiveService.backfill(req.params.instanceName, Number(req.body?.limit) || undefined));
      })
      .post('/purges/preview/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:admin');
        return res.status(HttpStatus.OK).json(await archiveService.previewPurge(req.params.instanceName, req.body));
      })
      .post('/purges/confirm', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:admin');
        return res
          .status(HttpStatus.OK)
          .json(await archiveService.confirmPurge(req.body?.previewId, req.body?.confirmationToken));
      })
      .get('/purges/tombstones/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:verify');
        return res.status(HttpStatus.OK).json(await archiveService.listTombstones(req.params.instanceName));
      })
      .post('/verify/:instanceName', ...guards, async (req, res) => {
        await archiveService.authorize(archiveKey(req), 'archive:verify');
        return res.status(HttpStatus.OK).json(await archiveService.verify(req.params.instanceName));
      });
  }

  public readonly router: Router = Router();
}
