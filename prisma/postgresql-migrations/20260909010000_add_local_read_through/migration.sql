-- Existing IsOnWhatsapp rows were global and cannot be assigned safely to an instance.
DROP TABLE IF EXISTS "IsOnWhatsapp";

CREATE TABLE "IsOnWhatsapp" (
  "id" TEXT NOT NULL,
  "remoteJid" VARCHAR(100) NOT NULL,
  "jidOptions" TEXT NOT NULL,
  "lid" VARCHAR(100),
  "exists" BOOLEAN NOT NULL DEFAULT true,
  "verifiedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  "instanceId" TEXT NOT NULL,
  CONSTRAINT "IsOnWhatsapp_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IsOnWhatsapp_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IsOnWhatsapp_instanceId_remoteJid_key" ON "IsOnWhatsapp"("instanceId", "remoteJid");
CREATE INDEX "IsOnWhatsapp_instanceId_idx" ON "IsOnWhatsapp"("instanceId");

CREATE TABLE "LocalReadSnapshot" (
  "id" TEXT NOT NULL,
  "method" VARCHAR(100) NOT NULL,
  "argumentsKey" VARCHAR(64) NOT NULL,
  "result" JSONB NOT NULL,
  "complete" BOOLEAN NOT NULL DEFAULT true,
  "fetchedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  "instanceId" TEXT NOT NULL,
  CONSTRAINT "LocalReadSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LocalReadSnapshot_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LocalReadSnapshot_instanceId_method_argumentsKey_key" ON "LocalReadSnapshot"("instanceId", "method", "argumentsKey");
CREATE INDEX "LocalReadSnapshot_instanceId_method_idx" ON "LocalReadSnapshot"("instanceId", "method");
