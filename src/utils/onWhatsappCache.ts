import { prismaRepository } from '@api/server.module';
import { configService, Database } from '@config/env.config';
import { Logger } from '@config/logger.config';
import dayjs from 'dayjs';

import { getAvailableNumbers } from './jidOptions';

const logger = new Logger('OnWhatsappCache');

interface ISaveOnWhatsappCacheParams {
  remoteJid: string;
  remoteJidAlt?: string;
  lid?: string | null;
  exists?: boolean;
}

function normalizeJid(jid: string | null | undefined): string | null {
  if (!jid) return null;
  return jid.startsWith('+') ? jid.slice(1) : jid;
}

export async function saveOnWhatsappCache(data: ISaveOnWhatsappCacheParams[], instanceId: string) {
  if (!configService.get<Database>('DATABASE').SAVE_DATA.IS_ON_WHATSAPP) {
    return;
  }

  // Process all items concurrently.
  const processingPromises = data.map(async (item) => {
    try {
      const remoteJid = normalizeJid(item.remoteJid);
      if (!remoteJid) {
        logger.warn('[saveOnWhatsappCache] Item skipped, missing remoteJid.');
        return;
      }

      const altJidNormalized = normalizeJid(item.remoteJidAlt);
      const lidAltJid = altJidNormalized?.endsWith('@lid') ? altJidNormalized : null;
      const explicitLid = normalizeJid(item.lid);
      const resolvedLid =
        (explicitLid?.endsWith('@lid') ? explicitLid : null) ??
        lidAltJid ??
        (remoteJid.endsWith('@lid') ? remoteJid : null);

      const baseJids = [remoteJid]; // Ensure remoteJid is present in the initial list.
      if (resolvedLid) {
        baseJids.push(resolvedLid);
      }

      const expandedJids = baseJids.flatMap((jid) => getAvailableNumbers(jid));

      // 1. Find an entry by jidOptions or remoteJid.
      // The current remoteJid may not be present in jidOptions yet, which causes:
      // 'Unique constraint failed on the fields: (`remoteJid`)'
      // This mainly affects groups whose ID contains the creator's number (for example, '559911223345-1234567890@g.us').
      const existingRecord = await prismaRepository.isOnWhatsapp.findFirst({
        where: {
          instanceId,
          OR: [
            ...expandedJids.map((jid) => ({ jidOptions: { contains: jid } })),
            { remoteJid: remoteJid }, // TODO: Determine why remoteJid is sometimes absent from jidOptions.
          ],
        },
      });

      logger.verbose(
        `[saveOnWhatsappCache] Register exists for [${expandedJids.join(',')}]? => ${existingRecord ? existingRecord.remoteJid : 'Not found'}`,
      );

      // 2. Merge JIDs in a Set to keep them unique.
      const finalJidOptions = new Set(expandedJids);

      if (resolvedLid) {
        finalJidOptions.add(resolvedLid);
      }

      if (existingRecord?.jidOptions) {
        existingRecord.jidOptions.split(',').forEach((jid) => finalJidOptions.add(jid));
      }

      // 3. Prepare the final payload.
      // Sort JIDs so the stored string is deterministic.
      const sortedJidOptions = [...finalJidOptions].sort();
      const newJidOptionsString = sortedJidOptions.join(',');
      const newLid = resolvedLid;

      const dataPayload = {
        remoteJid: remoteJid,
        jidOptions: newJidOptionsString,
        lid: newLid,
        exists: item.exists ?? true,
        verifiedAt: new Date(),
        instanceId,
      };

      // 4. Decide whether to create or update the record.
      if (existingRecord) {
        logger.verbose(
          `[saveOnWhatsappCache] Register exists, updating: remoteJid=${remoteJid}, jidOptions=${dataPayload.jidOptions}, lid=${dataPayload.lid}`,
        );
        await prismaRepository.isOnWhatsapp.update({
          where: { id: existingRecord.id },
          data: dataPayload,
        });
      } else {
        // Create a new entry.
        logger.verbose(
          `[saveOnWhatsappCache] Register does not exist, creating: remoteJid=${remoteJid}, jidOptions=${dataPayload.jidOptions}, lid=${dataPayload.lid}`,
        );
        await prismaRepository.isOnWhatsapp.create({
          data: dataPayload,
        });
      }
    } catch (e) {
      // Log the error without stopping the other operations.
      logger.error(`[saveOnWhatsappCache] Error processing item for ${item.remoteJid}: `);
      logger.error(e);
    }
  });

  // Wait for every concurrent operation to finish.
  await Promise.allSettled(processingPromises);
}

export async function getOnWhatsappCache(remoteJids: string[], instanceId: string) {
  let results: {
    remoteJid: string;
    number: string;
    jidOptions: string[];
    lid?: string;
    exists: boolean;
  }[] = [];

  if (configService.get<Database>('DATABASE').SAVE_DATA.IS_ON_WHATSAPP) {
    const remoteJidsWithoutPlus = remoteJids.map((remoteJid) => getAvailableNumbers(remoteJid)).flat();

    const onWhatsappCache = await prismaRepository.isOnWhatsapp.findMany({
      where: {
        instanceId,
        OR: remoteJidsWithoutPlus.map((remoteJid) => ({ jidOptions: { contains: remoteJid } })),
        updatedAt: {
          gte: dayjs().subtract(configService.get<Database>('DATABASE').SAVE_DATA.IS_ON_WHATSAPP_DAYS, 'days').toDate(),
        },
      },
    });

    results = onWhatsappCache.map((item) => ({
      remoteJid: item.remoteJid,
      number: item.remoteJid.split('@')[0],
      jidOptions: item.jidOptions.split(','),
      lid: item.lid,
      exists: item.exists,
    }));
  }

  return results;
}
